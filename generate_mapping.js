const fs = require('fs');
const code = fs.readFileSync('src/lib/constants.ts', 'utf8');

// Use existing mapping to map old keys to new keys
const newNamesToOld = {
  "Apples": "Apples",
  "Apricots (D2)": "Apricots",
  "Avocados": "Avocados",
  "Cherries": "Cherries",
  "Dates": "Dates",
  "Figs": "Figs",
  "Grapes (V)": "Grapes",
  "Kiwifruit": "Kiwifruit",
  "Peaches/Nect. (D5)": "Peaches",
  "Olives (C6)": "Olives",
  "Pears (D6)": "Pears",
  "Persimmons": "Persimmons",
  "Plums (D7)": "Plums & Prunes",
  "Pomegranates": "Pomegranates",
  "Oranges (C3)": "All Citrus",
  "Almonds": "Almonds",
  "Pecans": "Pecans",
  "Pistachios (D14)": "Pistachios",
  "Walnuts (D13)": "Walnuts",
  "Misc. Deciduous (D10)": "Fruits & Nuts unsp.",
  "Artichokes": "Artichokes",
  "Asparagus": "Asparagus",
  "Berries": "Berries",
  "Beans": "Beans",
  "Lima Beans": "Lima Beans",
  "Green Lima Beans": "Green Lima Beans",
  "Broccoli": "Broccoli",
  "Cabbage": "Cabbage",
  "Melons/Squash (T9)": "Squash",
  "Carrots": "Carrots",
  "Cauliflower": "Cauliflower",
  "Celery": "Celery",
  "Cucumbers": "Cucumbers",
  "Garlic": "Garlic",
  "Lettuce and Romaine": "Lettuce and Romaine",
  "Dry Onions": "Dry Onions",
  "Hot Peppers": "Hot Peppers",
  "Sweet Peppers": "Sweet Peppers",
  "Spinach": "Spinach",
  "Sweet Corn": "Sweet Corn",
  "Tomatoes Proc. (T15)": "Tomatoes",
  "Potatoes (T12)": "Potatoes",
  "Sweet Potatoes (T13)": "Sweet Potatos",
  "Sugar Beets": "Sugar Beets",
  "Unsp. vegetables": "Unsp. vegetables",
  "Corn, Sorghum (F16)": "Corn",
  "Wheat (G2)": "Wheat",
  "Barley": "Barley",
  "Oats": "Oats",
  "Rice (R1)": "Rice",
  "Safflower": "Safflower",
  "Sunflower": "Sunflower",
  "Cotton (F1)": "Cotton",
  "Alfalfa & Mixtures": "Alfalfa",
  "Unsp. Field & Seed": "Unsp. Field & Seed",
  "Bermuda Grass Seed": "Bermuda Grass Seed"
};

// Extract old characteristics logic
const charsMatch = code.match(/export const FEEDSTOCK_CHARACTERISTICS: \{[\s\S]*?\} = (\{[\s\S]*?\});\n\n\/\/ Helper function/);

if (!charsMatch) {
  console.log('Could not find FEEDSTOCK_CHARACTERISTICS block.');
  process.exit(1);
}

// Very hacky parse:
const charsText = charsMatch[1];
const oldObj = {};

const regex = /"([^"]+)":\s*\{([\s\S]*?)\}/g;
let match;
while ((match = regex.exec(charsText)) !== null) {
  oldObj[match[1]] = "{" + match[2] + "}";
}

let newText = "{\n";
let isFirst = true;

for (const [newName, oldName] of Object.entries(newNamesToOld)) {
  if (oldObj[oldName]) {
    if (!isFirst) newText += ",\n";
    newText += `  "${newName}": ${oldObj[oldName].trim()}`;
    isFirst = false;
  } else {
    console.log(`Warning: ${oldName} not found in old characteristics`);
  }
}
newText += "\n}";

fs.writeFileSync('new_characteristics.txt', newText);
console.log('Saved to new_characteristics.txt');
