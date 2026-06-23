/**
 * Geocode the California subset of the EPA "Excess Food Opportunities" dataset.
 *
 * The EPA dataset (national "Food Manufacturers and Processors") ships with no
 * coordinates, so the CA rows must be geocoded before they can be rendered as a
 * Mapbox point layer. This script reads the checked-in raw CA extract, geocodes
 * each facility's street address with the free U.S. Census Bureau batch geocoder
 * (no API key required), drops rows that fail to match or fall outside the
 * California bounding box, and writes a geocoded CSV that the build step
 * (`scripts/build-epa-food-processors.ts`) turns into GeoJSON-LD.
 *
 * Input : src/data/epa_food_processors_ca_raw.csv  (CA subset of the EPA export)
 * Output: src/data/epa_food_processors_ca.csv      (raw columns + latitude,longitude,geocode_status)
 *
 * Re-run with: npx tsx scripts/geocode-epa-food-processors.ts
 *
 * The Census batch endpoint accepts up to 10k records per request; we send
 * smaller batches sequentially for resilience and to keep each request well
 * under the server timeout.
 */
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const INPUT_PATH = path.join(process.cwd(), 'src/data/epa_food_processors_ca_raw.csv');
const OUTPUT_PATH = path.join(process.cwd(), 'src/data/epa_food_processors_ca.csv');
const CACHE_PATH = path.join(process.cwd(), '.context/epa-geocode-cache.json');
const BATCH_SIZE = 500;
const CONCURRENCY = 6; // Census per-request latency is high under load; parallelize batches
const REQUEST_TIMEOUT_MS = 180_000; // reject a genuinely hung request so withRetry can re-issue it
// The *locations* batch endpoint is fast and returns the geocoder's resolved
// matched address, which carries the matched state (e.g. "..., CA, 94111"). We
// keep a row only when that resolved state is California — authoritative against
// border mis-geocodes, since a bounding box alone cannot exclude western Nevada
// or southern Oregon (their coordinates fall inside any CA bbox). This guarantees
// zero out-of-state points (issue #116) without the slower geographies endpoint.
const GEOCODER_URL =
  'https://geocoding.geo.census.gov/geocoder/locations/addressbatch';
const BENCHMARK = 'Public_AR_Current';
const CA_STATE = 'CA';

// Generous California bounding box. Secondary guard against gross mis-geocodes
// in addition to the authoritative matched-state filter.
const CA_BBOX = { minLon: -124.55, maxLon: -114.0, minLat: 32.4, maxLat: 42.1 };

interface RawRow {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  [key: string]: string;
}

/** RFC-4180 CSV field quoting. */
function csvField(value: string): string {
  const v = value ?? '';
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

async function geocodeBatch(rows: RawRow[], startIndex: number): Promise<Map<number, [number, number]>> {
  // Census batch input: one CSV record per line -> id,street,city,state,zip (no header).
  const lines = rows
    .map((r, i) =>
      [
        String(startIndex + i),
        csvField(r.address),
        csvField(r.city),
        csvField(r.state),
        csvField(r.zip),
      ].join(','),
    )
    .join('\n');

  const form = new FormData();
  form.append('benchmark', BENCHMARK);
  // The Census batch endpoint requires the multipart field to be named exactly
  // `addressFile` (a `file` field yields HTTP 400 "Required part 'addressFile' is not present").
  form.append('addressFile', new Blob([lines], { type: 'text/csv' }), 'addresses.csv');

  // Race the request against a hard timeout. AbortController alone has proven
  // unreliable at interrupting a stalled Census connection, so we also reject via
  // Promise.race — withRetry then issues a fresh request. The abandoned socket is
  // left to GC.
  const controller = new AbortController();
  const doRequest = (async () => {
    const res = await fetch(GEOCODER_URL, { method: 'POST', body: form, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Census geocoder HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    return res.text();
  })();
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`));
    }, REQUEST_TIMEOUT_MS);
  });
  let text: string;
  try {
    text = await Promise.race([doRequest, timeout]);
  } finally {
    clearTimeout(timer!);
  }

  // Locations output rows for a match:
  //   id,input,status,matchType,matchedAddr,"lon,lat",tigerId,side
  // matchedAddr format: "STREET, CITY, ST, ZIP" -> the 2nd-to-last token is the state.
  const out = new Map<number, [number, number]>();
  const records = parse(text, { relax_column_count: true }) as string[][];
  for (const rec of records) {
    const id = Number(rec[0]);
    const status = rec[2];
    if (status !== 'Match') continue;
    const matchedAddr = rec[4] ?? '';
    const coord = rec[5]; // "lon,lat"
    if (!coord) continue;
    const addrParts = matchedAddr.split(',').map((p) => p.trim());
    const matchedState = addrParts.length >= 2 ? addrParts[addrParts.length - 2] : '';
    if (matchedState !== CA_STATE) continue; // authoritative: keep only California
    const [lonStr, latStr] = coord.split(',');
    const lon = Number(lonStr);
    const lat = Number(latStr);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    if (
      lon < CA_BBOX.minLon || lon > CA_BBOX.maxLon ||
      lat < CA_BBOX.minLat || lat > CA_BBOX.maxLat
    ) {
      continue; // belt-and-suspenders: gross mis-geocode outside CA bbox -> drop
    }
    out.set(id, [lon, lat]);
  }
  return out;
}

async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 8): Promise<T> {
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      // Census batch endpoint throws transient 502/503/504 under load; back off
      // (capped at 30s) and retry. The resume cache makes a full re-run cheap too.
      const wait = Math.min(5000 * i, 30000);
      console.warn(`  ${label} attempt ${i}/${attempts} failed: ${(err as Error).message}. Retrying in ${wait / 1000}s...`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

async function main(): Promise<void> {
  if (!fs.existsSync(INPUT_PATH)) {
    console.error(`Input not found: ${INPUT_PATH}`);
    process.exit(1);
  }
  const csvText = fs.readFileSync(INPUT_PATH, 'utf-8');
  const rows = parse(csvText, { columns: true, skip_empty_lines: true }) as RawRow[];
  const header = Object.keys(rows[0]);
  console.log(`Read ${rows.length} CA rows from ${path.basename(INPUT_PATH)}`);

  const outHeader = [...header, 'latitude', 'longitude', 'geocode_status'];
  const coords = new Map<number, [number, number]>();

  // Resume cache: row index -> [lon,lat] (matched in CA) or null (processed, dropped).
  // Lets the job survive the background-task time cap and resume across runs.
  const processed = new Set<number>();
  if (fs.existsSync(CACHE_PATH)) {
    const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8')) as Record<string, [number, number] | null>;
    for (const [k, v] of Object.entries(cache)) {
      processed.add(Number(k));
      if (v) coords.set(Number(k), v);
    }
    console.log(`Resuming: ${processed.size} rows already processed (${coords.size} CA matches) from cache.`);
  }

  const persistCache = () => {
    const obj: Record<string, [number, number] | null> = {};
    for (const i of processed) obj[i] = coords.get(i) ?? null;
    fs.writeFileSync(CACHE_PATH, JSON.stringify(obj), 'utf-8');
  };

  // Write the full output after each batch so a timeout/kill never loses progress.
  const flush = () => {
    const lines = [outHeader.join(',')];
    for (let i = 0; i < rows.length; i++) {
      const c = coords.get(i);
      if (!c) continue; // unmatched or out-of-CA -> drop
      const [lon, lat] = c;
      const rec = header.map((h) => csvField(rows[i][h] ?? ''));
      rec.push(String(lat), String(lon), 'success');
      lines.push(rec.join(','));
    }
    fs.writeFileSync(OUTPUT_PATH, lines.join('\n') + '\n', 'utf-8');
  };

  // Build the list of batches that still have pending rows.
  const total = Math.ceil(rows.length / BATCH_SIZE);
  const jobs: { n: number; pending: { row: RawRow; index: number }[] }[] = [];
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const pending: { row: RawRow; index: number }[] = [];
    for (let i = start; i < Math.min(start + BATCH_SIZE, rows.length); i++) {
      if (!processed.has(i)) pending.push({ row: rows[i], index: i });
    }
    if (pending.length > 0) jobs.push({ n: start / BATCH_SIZE + 1, pending });
  }
  console.log(`${jobs.length} batches remaining of ${total} (concurrency ${CONCURRENCY}).`);

  // Census per-request latency is high under load, so run batches concurrently.
  // JS is single-threaded between awaits, so updates to coords/processed and the
  // cache/output writes never truly race; concurrent flushes just re-snapshot.
  let cursor = 0;
  const worker = async () => {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      const localResult = await withRetry(() => geocodeBatch(job.pending.map((p) => p.row), 0), `batch ${job.n}`);
      let matched = 0;
      for (let j = 0; j < job.pending.length; j++) {
        const globalIdx = job.pending[j].index;
        processed.add(globalIdx);
        const c = localResult.get(j);
        if (c) { coords.set(globalIdx, c); matched++; }
      }
      persistCache();
      flush();
      console.log(`  Batch ${job.n}/${total}: matched ${matched}/${job.pending.length} (cumulative ${coords.size} CA / ${processed.size} processed) [flushed]`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const kept = coords.size;
  const rate = ((kept / rows.length) * 100).toFixed(1);
  console.log(`\nWrote ${kept} geocoded CA facilities to ${OUTPUT_PATH} (${rate}% match rate).`);
  console.log(`Dropped ${rows.length - kept} rows (no Census match, non-CA state, or outside CA bbox).`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
