import * as fs from 'fs';
import * as path from 'path';
import { buildCarbFeatures } from '../src/lib/carb-food-processors-build';

const CSV_PATH = path.join(process.cwd(), 'src/data/food_manufacturers_and_processor_facilities_carb.csv');
const OUTPUT_PATH = path.join(process.cwd(), 'src/data/carb-food-processor-facilities.geojson.ld');

const csvText = fs.readFileSync(CSV_PATH, 'utf-8');

// Count total data rows (excluding header)
const totalRows = csvText.trim().split('\n').length - 1;

const features = buildCarbFeatures(csvText);
const droppedCount = totalRows - features.length;

const lines = features.map(f => JSON.stringify(f)).join('\n');
fs.writeFileSync(OUTPUT_PATH, lines + '\n', 'utf-8');

console.log(`Wrote ${features.length} features to ${OUTPUT_PATH}`);
console.log(`Dropped ${droppedCount} rows (no valid coordinates)`);
