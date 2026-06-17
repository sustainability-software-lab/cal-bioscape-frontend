import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const TILESET_ID = 'sustainasoft.landiq-cropland-2026-06';
const SOURCE_ID = 'landiq_cropland_2024';
const SOURCE_LAYER = 'cropland_land_iq'; // stable name; must match tileset-registry.ts
const SOURCE_NAME = `mapbox://tileset-source/sustainasoft/${SOURCE_ID}`;
const BASE_URL = 'https://api.mapbox.com';
// Default output from preprocess_landiq.py; can override via LANDIQ_GEOJSONS env var
const GEOJSONS_PATH = process.env.LANDIQ_GEOJSONS ?? path.join(process.cwd(), 'landiq_2024_normalized.geojsons');

function apiUrl(apiPath: string, token: string): string {
  return `${BASE_URL}${apiPath}?access_token=${token}`;
}

export function buildRecipe(): object {
  return {
    version: 1,
    layers: {
      [SOURCE_LAYER]: {
        source: SOURCE_NAME,
        minzoom: 5,
        maxzoom: 14,
      },
    },
  };
}

async function uploadTilesetSource(token: string): Promise<void> {
  console.log(`Step 1: Uploading tileset source from ${path.basename(GEOJSONS_PATH)} ...`);
  const fileData = fs.readFileSync(GEOJSONS_PATH);
  const formData = new FormData();
  formData.append('file', new Blob([fileData], { type: 'application/x-ndjson' }), `${SOURCE_ID}.geojsons`);

  const res = await fetch(apiUrl(`/tilesets/v1/sources/sustainasoft/${SOURCE_ID}`, token), {
    method: 'POST',
    body: formData,
  });

  if (!res.ok && res.status !== 409) {
    const body = await res.text();
    throw new Error(`Source upload failed (${res.status}): ${body}`);
  }
  if (res.status === 409) {
    console.log('  Source already exists -- will overwrite via re-publish.');
  } else {
    console.log('  Source uploaded successfully.');
  }
}

async function createOrUpdateTileset(token: string): Promise<void> {
  console.log(`Step 2: Creating/updating tileset ${TILESET_ID} ...`);
  const recipe = buildRecipe();

  // Use POST to create; if already exists (409) patch the recipe instead
  const createRes = await fetch(apiUrl(`/tilesets/v1/${TILESET_ID}`, token), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipe, name: 'Cal BioScape LandIQ 2024 Cropland' }),
  });

  if (createRes.status === 409) {
    console.log('  Tileset already exists, patching recipe ...');
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
    const text = await createRes.text();
    throw new Error(`Tileset create failed (${createRes.status}): ${text}`);
  } else {
    console.log('  Tileset created successfully.');
  }
}

async function publishTileset(token: string): Promise<string> {
  console.log(`Step 3: Publishing ${TILESET_ID} ...`);
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
  console.log('Step 4: Polling for publish status ...');
  const maxAttempts = 90; // 15 minutes at 10s intervals
  const [username, tilesetName] = TILESET_ID.split('.');
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    // Use the list endpoint to check status (detail endpoint requires tilesets:read scope)
    const res = await fetch(apiUrl(`/tilesets/v1/${username}`, token));
    if (!res.ok) {
      console.warn(`  Status check failed (${res.status}), retrying...`);
      continue;
    }
    const tilesets = await res.json() as Array<{ id: string; status: string }>;
    const entry = tilesets.find(t => t.id === TILESET_ID);
    const status = entry?.status ?? 'unknown';
    console.log(`  Status: ${status} (attempt ${i + 1}/${maxAttempts})`);
    if (status === 'available') {
      console.log(`  Tileset published successfully. Job ID: ${jobId}`);
      return;
    }
    if (status === 'failed') {
      console.error('  Tileset publish failed. Check Mapbox Studio for error details.');
      process.exit(1);
    }
  }
  console.error('Timed out waiting for tileset publish (15 min). Check Mapbox Studio.');
  process.exit(1);
}

async function main(): Promise<void> {
  const token = process.env.MAPBOX_SECRET_TOKEN;
  if (!token) {
    console.error('MAPBOX_SECRET_TOKEN is not set.');
    console.error('Get it with: export MAPBOX_SECRET_TOKEN=$(gcloud secrets versions access latest --secret=mapbox-secret-token --project=biocirv-470318)');
    process.exit(1);
  }

  if (!fs.existsSync(GEOJSONS_PATH)) {
    console.error(`Preprocessed GeoJSONSeq not found: ${GEOJSONS_PATH}`);
    console.error('Run first: python scripts/preprocess_landiq.py <input.geojson> landiq_2024_normalized.geojsons');
    process.exit(1);
  }

  const sizeMB = (fs.statSync(GEOJSONS_PATH).size / 1024 / 1024).toFixed(1);
  console.log(`\nUploading LandIQ 2024 cropland tileset to sustainasoft Mapbox account`);
  console.log(`Tileset ID   : ${TILESET_ID}`);
  console.log(`Source layer : ${SOURCE_LAYER}`);
  console.log(`Source file  : ${GEOJSONS_PATH} (${sizeMB} MB)\n`);

  await uploadTilesetSource(token);
  await createOrUpdateTileset(token);
  const jobId = await publishTileset(token);
  await pollUntilComplete(token, jobId);

  console.log('\nDone! Tileset is live on the sustainasoft Mapbox account.');
  console.log(`Verify in Studio: https://studio.mapbox.com/tilesets/${TILESET_ID}`);
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop()!);
if (isMain) {
  main().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
  });
}
