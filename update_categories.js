const fs = require('fs');
let code = fs.readFileSync('src/lib/constants.ts', 'utf8');

const newCategories = `export const FEEDSTOCK_CATEGORIES = {
  ORCHARD_VINEYARD: 'Orchard & Vineyard Crops',
  ROW_TRUCK: 'Row & Truck Crops',
  FIELD: 'Field Crops',
  PASTURE_FORAGE: 'Pasture & Forage',
  IDLE_FALLOW: 'Idle & Fallow Land',
  MISCELLANEOUS: 'Miscellaneous'
} as const;`;

code = code.replace(/export const FEEDSTOCK_CATEGORIES = \{[\s\S]*?\} as const;/, newCategories);

const categoryMap = {
  "Apples": "ORCHARD_VINEYARD",
  "Apricots (D2)": "ORCHARD_VINEYARD",
  "Avocados": "ORCHARD_VINEYARD",
  "Cherries": "ORCHARD_VINEYARD",
  "Dates": "ORCHARD_VINEYARD",
  "Figs": "ORCHARD_VINEYARD",
  "Grapes (V)": "ORCHARD_VINEYARD",
  "Kiwifruit": "ORCHARD_VINEYARD",
  "Peaches/Nect. (D5)": "ORCHARD_VINEYARD",
  "Olives (C6)": "ORCHARD_VINEYARD",
  "Pears (D6)": "ORCHARD_VINEYARD",
  "Persimmons": "ORCHARD_VINEYARD",
  "Plums (D7)": "ORCHARD_VINEYARD",
  "Pomegranates": "ORCHARD_VINEYARD",
  "Oranges (C3)": "ORCHARD_VINEYARD",
  "Almonds": "ORCHARD_VINEYARD",
  "Pecans": "ORCHARD_VINEYARD",
  "Pistachios (D14)": "ORCHARD_VINEYARD",
  "Walnuts (D13)": "ORCHARD_VINEYARD",
  "Misc. Deciduous (D10)": "ORCHARD_VINEYARD",
  "Young Perennials": "ORCHARD_VINEYARD",
  
  "Artichokes": "ROW_TRUCK",
  "Asparagus": "ROW_TRUCK",
  "Berries": "ROW_TRUCK",
  "Beans": "ROW_TRUCK",
  "Lima Beans": "ROW_TRUCK",
  "Green Lima Beans": "ROW_TRUCK",
  "Broccoli": "ROW_TRUCK",
  "Cabbage": "ROW_TRUCK",
  "Melons/Squash (T9)": "ROW_TRUCK",
  "Carrots": "ROW_TRUCK",
  "Cauliflower": "ROW_TRUCK",
  "Celery": "ROW_TRUCK",
  "Cucumbers": "ROW_TRUCK",
  "Garlic": "ROW_TRUCK",
  "Lettuce and Romaine": "ROW_TRUCK",
  "Dry Onions": "ROW_TRUCK",
  "Hot Peppers": "ROW_TRUCK",
  "Sweet Peppers": "ROW_TRUCK",
  "Spinach": "ROW_TRUCK",
  "Sweet Corn": "ROW_TRUCK",
  "Tomatoes Proc. (T15)": "ROW_TRUCK",
  "Potatoes (T12)": "ROW_TRUCK",
  "Sweet Potatoes (T13)": "ROW_TRUCK",
  "Sugar Beets": "ROW_TRUCK",
  "Unsp. vegetables": "ROW_TRUCK",
  "Strawberries": "ROW_TRUCK",

  "Corn, Sorghum (F16)": "FIELD",
  "Wheat (G2)": "FIELD",
  "Barley": "FIELD",
  "Oats": "FIELD",
  "Rice (R1)": "FIELD",
  "Safflower": "FIELD",
  "Sunflower": "FIELD",
  "Cotton (F1)": "FIELD",
  "Unsp. Field & Seed": "FIELD",
  
  "Alfalfa & Mixtures": "PASTURE_FORAGE",
  "Bermuda Grass Seed": "PASTURE_FORAGE",
  "Induced high water table native pasture": "PASTURE_FORAGE",
  "Mixed Pasture": "PASTURE_FORAGE",
  "Native Pasture": "PASTURE_FORAGE",
  "Turf Farms": "PASTURE_FORAGE",

  "Idle – Long Term": "IDLE_FALLOW",
  "Idle – Short Term": "IDLE_FALLOW",
  "Unclassified Fallow": "IDLE_FALLOW",

  "Eucalyptus": "MISCELLANEOUS",
  "Flowers, Nursery and Christmas Tree Farms": "MISCELLANEOUS",
  "Greenhouse": "MISCELLANEOUS"
};

for (const [cropName, category] of Object.entries(categoryMap)) {
  const escapedName = cropName.replace(/[\(\)]/g, '\\$&');
  const regex = new RegExp(`("${escapedName}":\\s*\\{[\\s\\S]*?category:\\s*FEEDSTOCK_CATEGORIES\\.)[A-Z_]+(.*?)`, 'g');
  code = code.replace(regex, `$1${category}$2`);
}

fs.writeFileSync('src/lib/constants.ts', code);
console.log('Categories updated successfully.');
