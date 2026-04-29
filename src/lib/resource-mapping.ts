/**
 * Maps LandIQ / DWR crop names (used in the Mapbox tileset) to:
 *   - API resource display names   (used with /resources/ endpoints)
 *   - USDA NASS crop names          (used with /crops/ endpoints)
 *
 * Entries without a known mapping are intentionally omitted; callers
 * should check for undefined and fall back to static data.
 */

/** LandIQ crop name → production API resource name */
export const LANDIQ_TO_API_RESOURCE: Record<string, string> = {
  // Orchard & Vineyard
  Almonds: 'almond hulls',
  Walnuts: 'walnut shells',
  Pistachios: 'pistachio shells',
  Rice: 'rice straw',
  Wheat: 'wheat straw',
  Cotton: 'cotton stem mix',
  Tomatoes: 'tomato pomace',
  'Corn, Sorghum and Sudan': 'corn stover whole',
  Sorghum: 'corn stover whole',
  'Alfalfa & Alfalfa Mixtures': 'alfalfa',
  Grapes: 'grape pomace',
  Olives: 'olive pomace',
  Barley: 'barley straw',
  Oats: 'oats straw',
  Safflower: 'safflower straw',
  Sunflowers: 'sunflower stalks',
  'Sugar beets': 'sugar beet tops',
  'Wild Rice': 'rice straw',
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
