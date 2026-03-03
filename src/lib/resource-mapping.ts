/**
 * Maps LandIQ / DWR crop names (used in the Mapbox tileset) to:
 *   - API internal resource names  (used with /resources/ endpoints)
 *   - USDA NASS crop names          (used with /crops/ endpoints)
 *
 * Entries without a known mapping are intentionally omitted; callers
 * should check for undefined and fall back to static data.
 */

/** LandIQ crop name → API internal resource name */
export const LANDIQ_TO_API_RESOURCE: Record<string, string> = {
  // Orchard & Vineyard
  Almonds: 'almond_hulls',
  Walnuts: 'walnut_shells',
  Pistachios: 'pistachio_shells',
  Rice: 'rice_straw',
  Wheat: 'wheat_straw',
  Cotton: 'cotton_gin_trash',
  Tomatoes: 'tomato_pomace',
  'Corn, Sorghum and Sudan': 'corn_stover',
  Sorghum: 'corn_stover',
  'Alfalfa & Alfalfa Mixtures': 'alfalfa',
  Grapes: 'grape_pomace',
  Olives: 'olive_pomace',
  Barley: 'barley_straw',
  Oats: 'oat_straw',
  Safflower: 'safflower_straw',
  Sunflowers: 'sunflower_stalk',
  'Sugar beets': 'sugar_beet_tops',
  'Wild Rice': 'rice_straw',
};

/** LandIQ crop name → USDA NASS canonical crop name (uppercase) */
export const LANDIQ_TO_USDA_CROP: Record<string, string> = {
  Almonds: 'ALMONDS',
  Walnuts: 'WALNUTS',
  Pistachios: 'PISTACHIOS',
  Rice: 'RICE',
  'Wild Rice': 'RICE',
  Wheat: 'WHEAT',
  Cotton: 'COTTON',
  Tomatoes: 'TOMATOES',
  'Corn, Sorghum and Sudan': 'CORN',
  Sorghum: 'SORGHUM',
  'Alfalfa & Alfalfa Mixtures': 'HAY & HAYLAGE',
  Grapes: 'GRAPES',
  Olives: 'OLIVES',
  Barley: 'BARLEY',
  Oats: 'OATS',
  Safflower: 'SAFFLOWER',
  Sunflowers: 'SUNFLOWER',
  'Sugar beets': 'SUGARBEETS',
  Apples: 'APPLES',
  Apricots: 'APRICOTS',
  Avocados: 'AVOCADOS',
  Cherries: 'CHERRIES',
  Dates: 'DATES',
  'Miscellaneous Deciduous': 'TREE NUTS',
  'Peaches/Nectarines': 'PEACHES',
  Pears: 'PEARS',
  Plums: 'PLUMS & PRUNES',
  Prunes: 'PLUMS & PRUNES',
  Pomegranates: 'POMEGRANATES',
  'Citrus and Subtropical': 'ORANGES',
  'Miscellaneous Subtropical Fruits': 'ORANGES',
  Potatoes: 'POTATOES',
  'Sweet Potatoes': 'SWEETPOTATOES',
  'Beans (Dry)': 'BEANS',
  Strawberries: 'STRAWBERRIES',
};

/**
 * Given a LandIQ crop name, return the API internal resource name,
 * or `null` if no mapping is known.
 */
export function getApiResource(landiqCropName: string): string | null {
  return LANDIQ_TO_API_RESOURCE[landiqCropName] ?? null;
}

/**
 * Given a LandIQ crop name, return the USDA NASS canonical crop name,
 * or `null` if no mapping is known.
 */
export function getUsdaCropName(landiqCropName: string): string | null {
  return LANDIQ_TO_USDA_CROP[landiqCropName] ?? null;
}