// Import from tileset registry for centralized management
import { TILESET_REGISTRY } from './tileset-registry';

// Re-export for backward compatibility
export const FEEDSTOCK_TILESET_ID: string = TILESET_REGISTRY.feedstock.tilesetId;

// Crop residue factor mappings by crop type
// Each entry contains: { wetTonsPerAcre, moistureContent, dryTonsPerAcre }
// Values from the agricultural waste calculation methodology

// Orchard and Vineyard Residues (Prunings)
export const ORCHARD_VINEYARD_RESIDUES = {
  "Apples": { wetTonsPerAcre: 1.9, moistureContent: 0.4, dryTonsPerAcre: 1.2, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": false, "Aug": false, "Sep": false, "Oct": false, "Nov": true, "Dec": true } },
  "Apricots": { wetTonsPerAcre: 2.5, moistureContent: 0.4, dryTonsPerAcre: 1.5, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": true, "Aug": true, "Sep": false, "Oct": false, "Nov": false, "Dec": true } },
  "Avocados": { wetTonsPerAcre: 1.5, moistureContent: 0.4, dryTonsPerAcre: 0.9, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": true, "Apr": true, "May": true, "Jun": false, "Jul": false, "Aug": false, "Sep": false, "Oct": false, "Nov": false, "Dec": false } },
  "Cherries": { wetTonsPerAcre: 2.1, moistureContent: 0.4, dryTonsPerAcre: 1.2, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": true, "Aug": true, "Sep": false, "Oct": false, "Nov": false, "Dec": true } },
  "Dates": { wetTonsPerAcre: 0.6, moistureContent: 0.43, dryTonsPerAcre: 0.3, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": false, "Apr": false, "May": false, "Jun": true, "Jul": true, "Aug": false, "Sep": false, "Oct": false, "Nov": false, "Dec": false } },
  "Figs": { wetTonsPerAcre: 2.2, moistureContent: 0.43, dryTonsPerAcre: 1.3, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": false, "Aug": false, "Sep": false, "Oct": false, "Nov": true, "Dec": true } },
  "Grapes": { wetTonsPerAcre: 2.0, moistureContent: 0.45, dryTonsPerAcre: 1.1, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": true, "Apr": false, "May": false, "Jun": false, "Jul": false, "Aug": false, "Sep": false, "Oct": false, "Nov": false, "Dec": true } },
  "Kiwifruit": { wetTonsPerAcre: 2.0, moistureContent: 0.45, dryTonsPerAcre: 1.1, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": false, "Aug": false, "Sep": false, "Oct": false, "Nov": true, "Dec": true } },
  "Nectarines": { wetTonsPerAcre: 1.6, moistureContent: 0.43, dryTonsPerAcre: 0.9, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": false, "Aug": false, "Sep": false, "Oct": false, "Nov": true, "Dec": true } },
  "Olives": { wetTonsPerAcre: 1.1, moistureContent: 0.43, dryTonsPerAcre: 0.7, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": false, "Aug": false, "Sep": false, "Oct": false, "Nov": true, "Dec": true } },
  "Peaches": { wetTonsPerAcre: 2.3, moistureContent: 0.43, dryTonsPerAcre: 1.3, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": false, "Aug": false, "Sep": false, "Oct": false, "Nov": true, "Dec": true } },
  "Pears": { wetTonsPerAcre: 2.3, moistureContent: 0.4, dryTonsPerAcre: 1.4, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": false, "Aug": false, "Sep": false, "Oct": false, "Nov": true, "Dec": true } },
  "Persimmons": { wetTonsPerAcre: 1.6, moistureContent: 0.43, dryTonsPerAcre: 0.9, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": false, "Aug": false, "Sep": false, "Oct": false, "Nov": true, "Dec": true } },
  "Plums & Prunes": { wetTonsPerAcre: 1.5, moistureContent: 0.43, dryTonsPerAcre: 0.9, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": false, "Aug": false, "Sep": false, "Oct": false, "Nov": true, "Dec": true } },
  "Pomegranates": { wetTonsPerAcre: 1.6, moistureContent: 0.43, dryTonsPerAcre: 0.9, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": false, "Aug": false, "Sep": false, "Oct": false, "Nov": true, "Dec": true } },
  "All Citrus": { wetTonsPerAcre: 2.5, moistureContent: 0.4, dryTonsPerAcre: 1.5, seasonalAvailability: { "Jan": false, "Feb": true, "Mar": true, "Apr": false, "May": false, "Jun": true, "Jul": false, "Aug": false, "Sep": false, "Oct": false, "Nov": false, "Dec": false } },
  "Almonds": { wetTonsPerAcre: 2.5, moistureContent: 0.4, dryTonsPerAcre: 1.5, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": false, "Aug": false, "Sep": false, "Oct": true, "Nov": true, "Dec": true } },
  "Pecans": { wetTonsPerAcre: 1.6, moistureContent: 0.4, dryTonsPerAcre: 1.0, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": false, "Aug": false, "Sep": false, "Oct": false, "Nov": false, "Dec": true } },
  "Pistachios": { wetTonsPerAcre: 1.0, moistureContent: 0.43, dryTonsPerAcre: 0.6, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": false, "Aug": false, "Sep": false, "Oct": false, "Nov": false, "Dec": true } },
  "Walnuts": { wetTonsPerAcre: 1.0, moistureContent: 0.43, dryTonsPerAcre: 0.6, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": false, "Aug": false, "Sep": false, "Oct": false, "Nov": false, "Dec": true } },
  "Fruits & Nuts unsp.": { wetTonsPerAcre: 1.6, moistureContent: 0.5, dryTonsPerAcre: 0.8, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": false, "Aug": false, "Sep": false, "Oct": false, "Nov": true, "Dec": true } }
};

// Row Crop Residues
export const ROW_CROP_RESIDUES = {
  "Artichokes": { residueType: "Top Silage", wetTonsPerAcre: 1.7, moistureContent: 0.73, dryTonsPerAcre: 0.5, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": true, "Apr": true, "May": true, "Jun": false, "Jul": false, "Aug": false, "Sep": true, "Oct": true, "Nov": false, "Dec": false } },
  "Asparagus": { residueType: "", wetTonsPerAcre: 2.2, moistureContent: 0.8, dryTonsPerAcre: 0.4, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": true, "Apr": true, "May": true, "Jun": true, "Jul": false, "Aug": false, "Sep": false, "Oct": false, "Nov": false, "Dec": false } },
  "Green Lima Beans": { residueType: "Vines and Leaves", wetTonsPerAcre: 1.0, moistureContent: 0.8, dryTonsPerAcre: 0.2, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": true, "Aug": true, "Sep": true, "Oct": false, "Nov": false, "Dec": false } },
  "Berries": { residueType: "Prunings and Leaves", wetTonsPerAcre: 1.3, moistureContent: 0.4, dryTonsPerAcre: 0.8, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": true, "Aug": true, "Sep": false, "Oct": false, "Nov": true, "Dec": true } },
  "Snap Beans": { residueType: "Vines and Leaves", wetTonsPerAcre: 1.0, moistureContent: 0.8, dryTonsPerAcre: 0.2, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": true, "Jun": true, "Jul": true, "Aug": true, "Sep": true, "Oct": true, "Nov": false, "Dec": false } },
  "Broccoli": { residueType: "", wetTonsPerAcre: 1.0, moistureContent: 0.8, dryTonsPerAcre: 0.2, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": true, "Apr": true, "May": false, "Jun": false, "Jul": false, "Aug": false, "Sep": true, "Oct": true, "Nov": true, "Dec": true } },
  "Cabbage": { residueType: "", wetTonsPerAcre: 1.0, moistureContent: 0.8, dryTonsPerAcre: 0.2, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": true, "Apr": true, "May": true, "Jun": true, "Jul": false, "Aug": false, "Sep": true, "Oct": true, "Nov": true, "Dec": true } },
  "Cantaloupe Melons": { residueType: "Vines and Leaves", wetTonsPerAcre: 1.2, moistureContent: 0.8, dryTonsPerAcre: 0.2, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": false, "Jun": true, "Jul": true, "Aug": true, "Sep": true, "Oct": false, "Nov": false, "Dec": false } },
  "Carrots": { residueType: "Top Silage", wetTonsPerAcre: 1.0, moistureContent: 0.84, dryTonsPerAcre: 0.2, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": true, "Apr": true, "May": true, "Jun": true, "Jul": true, "Aug": true, "Sep": true, "Oct": true, "Nov": true, "Dec": true } },
  "Cauliflower": { residueType: "", wetTonsPerAcre: 1.0, moistureContent: 0.8, dryTonsPerAcre: 0.2, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": true, "Apr": true, "May": false, "Jun": false, "Jul": false, "Aug": false, "Sep": true, "Oct": true, "Nov": true, "Dec": true } },
  "Celery": { residueType: "", wetTonsPerAcre: 1.0, moistureContent: 0.8, dryTonsPerAcre: 0.2, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": false, "Aug": false, "Sep": false, "Oct": true, "Nov": true, "Dec": true } },
  "Cucumbers": { residueType: "Vines and Leaves", wetTonsPerAcre: 1.7, moistureContent: 0.8, dryTonsPerAcre: 0.3, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": true, "Jun": true, "Jul": true, "Aug": true, "Sep": true, "Oct": true, "Nov": false, "Dec": false } },
  "Garlic": { residueType: "", wetTonsPerAcre: 1.0, moistureContent: 0.73, dryTonsPerAcre: 0.3, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": false, "Jun": true, "Jul": true, "Aug": true, "Sep": false, "Oct": false, "Nov": false, "Dec": false } },
  "Combined Melons": { residueType: "Vines and Leaves", wetTonsPerAcre: 1.2, moistureContent: 0.8, dryTonsPerAcre: 0.2, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": false, "Jun": true, "Jul": true, "Aug": true, "Sep": true, "Oct": false, "Nov": false, "Dec": false } },
  "Lettuce and Romaine": { residueType: "", wetTonsPerAcre: 1.0, moistureContent: 0.8, dryTonsPerAcre: 0.2, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": true, "Apr": true, "May": true, "Jun": true, "Jul": true, "Aug": true, "Sep": true, "Oct": true, "Nov": true, "Dec": true } },
  "Dry Onions": { residueType: "", wetTonsPerAcre: 1.0, moistureContent: 0.73, dryTonsPerAcre: 0.3, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": true, "Jun": true, "Jul": true, "Aug": true, "Sep": true, "Oct": true, "Nov": false, "Dec": false } },
  "Green Onions": { residueType: "", wetTonsPerAcre: 1.0, moistureContent: 0.73, dryTonsPerAcre: 0.3, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": true, "Apr": true, "May": true, "Jun": true, "Jul": true, "Aug": true, "Sep": true, "Oct": true, "Nov": true, "Dec": true } },
  "Hot Peppers": { residueType: "Stems & Leaf Meal", wetTonsPerAcre: 1.0, moistureContent: 0.8, dryTonsPerAcre: 0.2, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": true, "Aug": true, "Sep": true, "Oct": true, "Nov": false, "Dec": false } },
  "Sweet Peppers": { residueType: "Stems & Leaf Meal", wetTonsPerAcre: 1.0, moistureContent: 0.8, dryTonsPerAcre: 0.2, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": true, "Aug": true, "Sep": true, "Oct": true, "Nov": false, "Dec": false } },
  "Spices & herbs": { residueType: "", wetTonsPerAcre: 1.1, moistureContent: 0.8, dryTonsPerAcre: 0.2, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": true, "Apr": true, "May": true, "Jun": true, "Jul": true, "Aug": true, "Sep": true, "Oct": true, "Nov": true, "Dec": true } },
  "Spinach": { residueType: "", wetTonsPerAcre: 1.0, moistureContent: 0.8, dryTonsPerAcre: 0.2, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": true, "Apr": true, "May": false, "Jun": false, "Jul": false, "Aug": false, "Sep": true, "Oct": true, "Nov": true, "Dec": true } },
  "Squash": { residueType: "Vines and Leaves", wetTonsPerAcre: 1.2, moistureContent: 0.8, dryTonsPerAcre: 0.2, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": true, "Jun": true, "Jul": true, "Aug": true, "Sep": true, "Oct": false, "Nov": false, "Dec": false } },
  "Sweet Corn": { residueType: "Stover", wetTonsPerAcre: 4.7, moistureContent: 0.2, dryTonsPerAcre: 3.8, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": false, "Jun": true, "Jul": true, "Aug": true, "Sep": true, "Oct": true, "Nov": false, "Dec": false } },
  "Tomatoes": { residueType: "Vines and Leaves", wetTonsPerAcre: 1.3, moistureContent: 0.8, dryTonsPerAcre: 0.3, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": false, "Jun": true, "Jul": true, "Aug": true, "Sep": true, "Oct": true, "Nov": false, "Dec": false } },
  "Unsp. vegetables": { residueType: "", wetTonsPerAcre: 1.4, moistureContent: 0.8, dryTonsPerAcre: 0.3, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": true, "Apr": true, "May": true, "Jun": true, "Jul": true, "Aug": true, "Sep": true, "Oct": true, "Nov": true, "Dec": true } },
  "Potatoes": { residueType: "Vines and Leaves", wetTonsPerAcre: 1.2, moistureContent: 0.8, dryTonsPerAcre: 0.2, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": true, "May": true, "Jun": true, "Jul": true, "Aug": true, "Sep": false, "Oct": false, "Nov": false, "Dec": false } },
  "Sweet Potatos": { residueType: "Vines and Leaves", wetTonsPerAcre: 1.2, moistureContent: 0.8, dryTonsPerAcre: 0.2, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": true, "Aug": true, "Sep": true, "Oct": true, "Nov": false, "Dec": false } },
  "Sugar Beets": { residueType: "Top Silage", wetTonsPerAcre: 2.4, moistureContent: 0.75, dryTonsPerAcre: 0.6, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": true, "May": true, "Jun": true, "Jul": true, "Aug": true, "Sep": true, "Oct": false, "Nov": false, "Dec": false } }
};

// Field Crop Residues
export const FIELD_CROP_RESIDUES = {
  "Corn": { residueType: "Stover", wetTonsPerAcre: 2.9, moistureContent: 0.2, dryTonsPerAcre: 2.3, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": false, "Aug": true, "Sep": true, "Oct": true, "Nov": true, "Dec": false } },
  "Sorghum": { residueType: "Stover", wetTonsPerAcre: 2.2, moistureContent: 0.2, dryTonsPerAcre: 1.8, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": false, "Aug": true, "Sep": true, "Oct": true, "Nov": false, "Dec": false } },
  "Wheat": { residueType: "Straw & Stubble", wetTonsPerAcre: 1.2, moistureContent: 0.14, dryTonsPerAcre: 1.0, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": true, "Jun": true, "Jul": true, "Aug": true, "Sep": false, "Oct": false, "Nov": false, "Dec": false } },
  "Barley": { residueType: "Straw & Stubble", wetTonsPerAcre: 0.9, moistureContent: 0.15, dryTonsPerAcre: 0.7, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": false, "Jun": true, "Jul": true, "Aug": true, "Sep": false, "Oct": false, "Nov": false, "Dec": false } },
  "Oats": { residueType: "Straw & Stubble", wetTonsPerAcre: 0.5, moistureContent: 0.15, dryTonsPerAcre: 0.4, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": false, "Jun": true, "Jul": true, "Aug": false, "Sep": false, "Oct": false, "Nov": false, "Dec": false } },
  "Rice": { residueType: "Straw", wetTonsPerAcre: 1.8, moistureContent: 0.14, dryTonsPerAcre: 1.6, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": false, "Aug": false, "Sep": true, "Oct": true, "Nov": false, "Dec": false } },
  "Safflower": { residueType: "Straw & Stubble", wetTonsPerAcre: 0.9, moistureContent: 0.14, dryTonsPerAcre: 0.8, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": true, "Aug": true, "Sep": true, "Oct": false, "Nov": false, "Dec": false } },
  "Sunflower": { residueType: "Straw & Stubble", wetTonsPerAcre: 0.9, moistureContent: 0.14, dryTonsPerAcre: 0.8, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": false, "Aug": true, "Sep": true, "Oct": true, "Nov": false, "Dec": false } },
  "Cotton": { residueType: "Straw & Stubble", wetTonsPerAcre: 1.5, moistureContent: 0.14, dryTonsPerAcre: 1.3, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": false, "Aug": false, "Sep": true, "Oct": true, "Nov": true, "Dec": false } },
  "Beans": { residueType: "vines and leaves", wetTonsPerAcre: 1.0, moistureContent: 0.8, dryTonsPerAcre: 0.2, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": true, "Aug": true, "Sep": true, "Oct": false, "Nov": false, "Dec": false } },
  "Lima Beans": { residueType: "Vines and Leaves", wetTonsPerAcre: 1.0, moistureContent: 0.8, dryTonsPerAcre: 0.2, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": true, "Aug": true, "Sep": true, "Oct": false, "Nov": false, "Dec": false } },
  "Cowpeas & South. Peas": { residueType: "Vines and Leaves", wetTonsPerAcre: 1.0, moistureContent: 0.8, dryTonsPerAcre: 0.2, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": true, "Aug": true, "Sep": true, "Oct": false, "Nov": false, "Dec": false } },
  "Soybeans": { residueType: "Stover", wetTonsPerAcre: 1.0, moistureContent: 0.2, dryTonsPerAcre: 0.8, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": false, "Jun": false, "Jul": false, "Aug": false, "Sep": true, "Oct": true, "Nov": false, "Dec": false } },
  "Rye": { residueType: "Straw & Stubble", wetTonsPerAcre: 0.5, moistureContent: 0.14, dryTonsPerAcre: 0.4, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": false, "Jun": true, "Jul": true, "Aug": false, "Sep": false, "Oct": false, "Nov": false, "Dec": false } },
  "Triticale": { residueType: "Straw & Stubble", wetTonsPerAcre: 1.2, moistureContent: 0.14, dryTonsPerAcre: 1.0, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": true, "Jun": true, "Jul": true, "Aug": false, "Sep": false, "Oct": false, "Nov": false, "Dec": false } },
  "Alfalfa": { residueType: "Stems & Leaf Meal", wetTonsPerAcre: 1.0, moistureContent: 0.11, dryTonsPerAcre: 0.9, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": true, "Apr": true, "May": true, "Jun": true, "Jul": true, "Aug": true, "Sep": true, "Oct": true, "Nov": false, "Dec": false } },
  "Bermuda Grass Seed": { residueType: "Grass", wetTonsPerAcre: 1.0, moistureContent: 0.6, dryTonsPerAcre: 0.4, seasonalAvailability: { "Jan": false, "Feb": false, "Mar": false, "Apr": false, "May": true, "Jun": true, "Jul": true, "Aug": true, "Sep": true, "Oct": false, "Nov": false, "Dec": false } },
  "Unsp. Field & Seed": { residueType: "Stubble", wetTonsPerAcre: 1.0, moistureContent: 0.14, dryTonsPerAcre: 0.86, seasonalAvailability: { "Jan": true, "Feb": true, "Mar": true, "Apr": true, "May": true, "Jun": true, "Jul": true, "Aug": true, "Sep": true, "Oct": true, "Nov": true, "Dec": true } }
};

// Mapping table for crop name standardization
// This maps the crop names in the database to the names in our residue factor tables
export const CROP_NAME_MAPPING = {
  // Orchard and Vineyard crops
  "Apples": "Apples",
  "Apricots": "Apricots",
  "Avocados": "Avocados",
  "Cherries": "Cherries",
  "Dates": "Dates",
  "Figs": "Figs",
  "Grapes": "Grapes",
  "Kiwis": "Kiwifruit",
  "Nectarines": "Nectarines",
  "Olives": "Olives",
  "Peaches/Nectarines": "Peaches",
  "Pears": "Pears",
  "Persimmons": "Persimmons",
  "Plums": "Plums & Prunes",
  "Prunes": "Plums & Prunes",
  "Pomegranates": "Pomegranates",
  "Citrus and Subtropical": "All Citrus",
  "Miscellaneous Subtropical Fruits": "All Citrus",
  "Almonds": "Almonds",
  "Pecans": "Pecans",
  "Pistachios": "Pistachios",
  "Walnuts": "Walnuts",
  "Miscellaneous Deciduous": "Fruits & Nuts unsp.",
  
  // Row crops
  "Artichokes": "Artichokes",
  "Asparagus": "Asparagus",
  "Bush Berries": "Berries",
  "Beans (Dry)": "Beans",
  "Lima Beans": "Lima Beans",
  "Green Lima Beans": "Green Lima Beans",
  "Broccoli": "Broccoli",
  "Cabbage": "Cabbage",
  "Cole Crops": "Cabbage",
  "Melons, Squash and Cucumbers": "Combined Melons",
  "Carrots": "Carrots",
  "Cauliflower": "Cauliflower",
  "Celery": "Celery",
  "Cucumbers": "Cucumbers",
  "Garlic": "Garlic",
  "Lettuce/Leafy Greens": "Lettuce and Romaine",
  "Onions and Garlic": "Dry Onions",
  "Peppers": "Hot Peppers",
  "Sweet Peppers": "Sweet Peppers",
  "Spinach": "Spinach",
  "Squash": "Squash",
  "Sweet Corn": "Sweet Corn",
  "Tomatoes": "Tomatoes",
  "Potatoes": "Potatoes",
  "Sweet Potatoes": "Sweet Potatos",
  "Sugar beets": "Sugar Beets",
  "Miscellaneous Truck Crops": "Unsp. vegetables",
  
  // Field crops
  "Corn, Sorghum and Sudan": "Corn",
  "Sorghum": "Sorghum",
  "Wheat": "Wheat",
  "Barley": "Barley",
  "Oats": "Oats",
  "Rice": "Rice",
  "Wild Rice": "Rice",
  "Safflower": "Safflower",
  "Sunflowers": "Sunflower",
  "Cotton": "Cotton",
  "Alfalfa & Alfalfa Mixtures": "Alfalfa",
  "Miscellaneous Field Crops": "Unsp. Field & Seed",
  "Miscellaneous Grain and Hay": "Unsp. Field & Seed",
  "Miscellaneous Grasses": "Bermuda Grass Seed"
};

// Helper functions for crop residue calculations
export const getCropResidueFactors = (cropName: string) => {
  // Get the standardized crop name from mapping
  const standardizedName = CROP_NAME_MAPPING[cropName as keyof typeof CROP_NAME_MAPPING] || null;
  
  if (!standardizedName) {
    return null;
  }
  
  // Check each residue category
  if (standardizedName in ORCHARD_VINEYARD_RESIDUES) {
    return {
      ...ORCHARD_VINEYARD_RESIDUES[standardizedName as keyof typeof ORCHARD_VINEYARD_RESIDUES],
      category: 'Orchard and Vineyard',
      residueType: 'Prunings'
    };
  }
  
  if (standardizedName in ROW_CROP_RESIDUES) {
    return {
      ...ROW_CROP_RESIDUES[standardizedName as keyof typeof ROW_CROP_RESIDUES],
      category: 'Row Crop'
    };
  }
  
  if (standardizedName in FIELD_CROP_RESIDUES) {
    return {
      ...FIELD_CROP_RESIDUES[standardizedName as keyof typeof FIELD_CROP_RESIDUES],
      category: 'Field Crop'
    };
  }
  
  return null;
};

// Re-export from tileset registry for backward compatibility
export const INFRASTRUCTURE_LAYERS = {
  "power_plants": {
    tilesetId: TILESET_REGISTRY.powerPlants.tilesetId,
    sourceLayer: TILESET_REGISTRY.powerPlants.sourceLayer,
  },
  "food_banks": {
    tilesetId: TILESET_REGISTRY.foodBanks.tilesetId,
    sourceLayer: TILESET_REGISTRY.foodBanks.sourceLayer,
  },
  "farmers_markets": {
    tilesetId: TILESET_REGISTRY.farmersMarkets.tilesetId,
    sourceLayer: TILESET_REGISTRY.farmersMarkets.sourceLayer,
  },
};
