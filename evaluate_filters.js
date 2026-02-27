const fs = require('fs');

// Read source code
const constantsCode = fs.readFileSync('src/lib/constants.ts', 'utf8');

// Extract mapping
const mapStr = '{' + constantsCode.match(/export const CROP_NAME_MAPPING = \{([\s\S]*?)\};/)[1] + '}';
const CROP_NAME_MAPPING = new Function('return ' + mapStr)();

// Extract characteristics
const charsMatch = constantsCode.match(/export const FEEDSTOCK_CHARACTERISTICS: \{[\s\S]*?\} = \{([\s\S]*?)\};\n\n\/\/ Helper function/);
const charsStr = '{' + charsMatch[1] + '}';
const keys = [];
let m;
const regex = /\"(.*?)\":\s*\{/g;
while ((m = regex.exec(charsMatch[1])) !== null) {
  keys.push(m[1]);
}

// Extract layers
const layerCode = fs.readFileSync('src/components/LayerControls.tsx', 'utf8');
const match1 = layerCode.match(/const cropColorMapping: CropColorMap = useMemo\(\(\) => \(\{([\s\S]*?)\}\), \[\]\);/);
const objStr = '{' + match1[1] + '}';
const cropColorMapping = new Function('return ' + objStr)();
const allCropNames = Object.keys(cropColorMapping);

let visible = [];
for (const cropName of allCropNames) {
  const standardizedName = CROP_NAME_MAPPING[cropName];
  if (!standardizedName) {
    visible.push(cropName); // shows by default
    continue;
  }
  
  if (keys.includes(standardizedName)) {
    visible.push(cropName);
  }
}

console.log("Visible crops count:", visible.length, "out of", allCropNames.length);
if (visible.length !== allCropNames.length) {
  console.log("Missing crops:", allCropNames.filter(c => !visible.includes(c)));
}

