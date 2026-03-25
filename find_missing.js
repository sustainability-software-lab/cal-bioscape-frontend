const fs = require('fs');

// Read the 56 crops from LayerControls.tsx
const code = fs.readFileSync('src/components/LayerControls.tsx', 'utf8');
const match1 = code.match(/const cropColorMapping: CropColorMap = useMemo\(\(\) => \(\{([\s\S]*?)\}\), \[\]\);/);
const objStr = '{' + match1[1] + '}';
const cropColorMapping = new Function('return ' + objStr)();
const mapCrops = Object.keys(cropColorMapping);

// Read the 94 crops from resource_info.json
const data = JSON.parse(fs.readFileSync('temp_resource_info.json', 'utf8'));
const resourceCrops = [...new Set(data.map(d => d.landiq_crop_name))];

const missingFromMap = resourceCrops.filter(c => !mapCrops.includes(c));

console.log('Crops in JSON but not in LayerControls.tsx mapping:', missingFromMap);
