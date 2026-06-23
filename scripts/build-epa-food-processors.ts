import * as fs from 'fs';
import * as path from 'path';
import { buildEpaFeatures } from '../src/lib/epa-food-processors-build';

const CSV_PATH = path.join(process.cwd(), 'src/data/epa_food_processors_ca.csv');
const OUTPUT_PATH = path.join(process.cwd(), 'src/data/epa-food-processor-facilities.geojson.ld');

const csvText = fs.readFileSync(CSV_PATH, 'utf-8');

// Count total data rows (excluding header)
const totalRows = csvText.trim().split('\n').length - 1;

const features = buildEpaFeatures(csvText);
const droppedCount = totalRows - features.length;

const lines = features.map(f => JSON.stringify(f)).join('\n');
fs.writeFileSync(OUTPUT_PATH, lines + '\n', 'utf-8');

console.log(`Wrote ${features.length} features to ${OUTPUT_PATH}`);
console.log(`Dropped ${droppedCount} rows (no valid coordinates or outside CA bbox)`);
