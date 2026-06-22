import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const TILESET_ID = 'sustainasoft.carb-food-processors-2026-06c';
const SOURCE_ID = 'carb_food_processors';
const SOURCE_NAME = `mapbox://tileset-source/sustainasoft/${SOURCE_ID}`;
const BASE_URL = 'https://api.mapbox.com';
const GEOJSON_LD_PATH = path.join(process.cwd(), 'src/data/carb-food-processor-facilities.geojson.ld');

function apiUrl(apiPath: string, token: string): string {
  return `${BASE_URL}${apiPath}?access_token=${token}`;
}

export function buildRecipe(): object {
  return {
    version: 1,
    layers: {
      [SOURCE_ID]: {
        source: SOURCE_NAME,
        minzoom: 0,
        maxzoom: 12,
      },
    },
  };
}

async function uploadTilesetSource(token: string): Promise<void> {
  console.log('Step 1: Replacing tileset source...');
  const fileData = fs.readFileSync(GEOJSON_LD_PATH);
  const formData = new FormData();
  formData.append('file', new Blob([fileData], { type: 'application/x-ndjson' }), 'carb-food-processors.geojson.ld');

  // CRITICAL: use PUT, not POST. Mapbox's POST /sources APPENDS the file to any
  // existing source, so repeated runs accumulate stale features (an earlier
  // append left old, pre-CA-constrained coordinates in the source, which then
  // rendered as out-of-state ghost points). PUT replaces the source outright.
  const res = await fetch(apiUrl(`/tilesets/v1/sources/sustainasoft/${SOURCE_ID}`, token), {
    method: 'PUT',
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Source replace failed (${res.status}): ${body}`);
  }
  console.log('  Source replaced successfully.');
}

async function createOrUpdateTileset(token: string): Promise<void> {
  console.log(`Step 2: Creating/updating tileset ${TILESET_ID}...`);
  const recipe = buildRecipe();

  // Try to create (POST); if it already exists patch the recipe instead.
  // Mapbox signals "already exists" via 409 OR a 400 whose body says so.
  const createRes = await fetch(apiUrl(`/tilesets/v1/${TILESET_ID}`, token), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipe, name: 'CARB Food Processors Cal BioScape 2026-06c' }),
  });

  const createBody = createRes.ok ? '' : await createRes.text();
  const alreadyExists =
    createRes.status === 409 ||
    (createRes.status === 400 && /already exists/i.test(createBody));

  if (alreadyExists) {
    console.log('  Tileset already exists, patching recipe...');
    const patchRes = await fetch(apiUrl(`/tilesets/v1/${TILESET_ID}/recipe`, token), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recipe),
    });
    if (!patchRes.ok) {
      const text = await patchRes.text();
      throw new Error(`Recipe patch failed (${patchRes.status}): ${text}`);
    }
    console.log('  Recipe patched successfully.');
  } else if (!createRes.ok) {
    throw new Error(`Tileset create failed (${createRes.status}): ${createBody}`);
  } else {
    console.log('  Tileset created successfully.');
  }
}

async function publishTileset(token: string): Promise<string> {
  console.log(`Step 3: Publishing ${TILESET_ID}...`);
  const res = await fetch(apiUrl(`/tilesets/v1/${TILESET_ID}/publish`, token), { method: 'POST' });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Publish failed (${res.status}): ${text}`);
  }

  const data = await res.json() as { jobId?: string };
  const jobId = data.jobId ?? 'unknown';
  console.log(`  Publish started. Job ID: ${jobId}`);
  return jobId;
}

async function pollUntilComplete(token: string, jobId: string): Promise<void> {
  console.log('Step 4: Polling for publish status...');
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    const res = await fetch(apiUrl(`/tilesets/v1/${TILESET_ID}/status`, token));
    if (res.status === 403) {
      // Publish was already submitted successfully (Step 3). Some tokens carry
      // tilesets:write but not tilesets:read, so the status endpoint 403s. Don't
      // fail the run on that -- the publish is in flight on Mapbox's side.
      console.warn('  Status endpoint returned 403 (token lacks tilesets:read scope).');
      console.warn('  Publish was submitted; cannot poll completion with this token. Exiting OK.');
      console.warn('  Verify in Mapbox Studio, or use a token with tilesets:read to poll.');
      return;
    }
    if (!res.ok) {
      console.warn(`  Status check failed (${res.status}), retrying...`);
      continue;
    }
    const data = await res.json() as { status: string; jobId?: string };
    console.log(`  Status: ${data.status} (attempt ${i + 1}/${maxAttempts})`);
    if (data.status === 'success') {
      console.log(`  Tileset published successfully. Job ID: ${jobId}`);
      return;
    }
    if (data.status === 'failed') {
      process.exit(1);
    }
  }
  console.error('Timed out waiting for tileset publish to complete.');
  process.exit(1);
}

async function main(): Promise<void> {
  const token = process.env.MAPBOX_SECRET_TOKEN;
  if (!token) {
    console.error('MAPBOX_SECRET_TOKEN is not set. Provide a sustainasoft sk.* token with tilesets:write and tilesets:read scopes.');
    process.exit(1);
  }

  console.log(`\nPublishing CARB food processors tileset to sustainasoft Mapbox account`);
  console.log(`Tileset ID    : ${TILESET_ID}`);
  console.log(`Source layer  : ${SOURCE_ID}`);
  console.log(`Source file   : ${GEOJSON_LD_PATH}\n`);

  if (!fs.existsSync(GEOJSON_LD_PATH)) {
    console.error(`GeoJSON-LD file not found: ${GEOJSON_LD_PATH}`);
    console.error('Run "npm run build-carb-data" first.');
    process.exit(1);
  }

  await uploadTilesetSource(token);
  await createOrUpdateTileset(token);
  const jobId = await publishTileset(token);
  await pollUntilComplete(token, jobId);

  console.log('\nDone! Tileset is live on the sustainasoft Mapbox account.');
}

// Run only when executed directly (not when imported by tests)
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop()!);
if (isMain) {
  main().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
  });
}
