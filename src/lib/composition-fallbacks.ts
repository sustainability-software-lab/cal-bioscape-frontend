/**
 * Literature-based fallback biomass composition values for LandIQ crop types.
 *
 * Covers two groups:
 *   1. Crops NOT in LANDIQ_TO_API_RESOURCE (no API mapping — always use these values).
 *   2. Crops WITH an API mapping but for which the API currently returns no data
 *      (hasData: false). cropPassesCompositionFilters falls back here automatically.
 *
 * All values are on a dry basis:
 *   - cellulose, lignin, ash: % (w/w dry)
 *   - hhv: MJ/kg (higher heating value)
 *   - moisture: % as-received (equilibrium/air-dried or fresh, depending on residue type)
 *
 * Sources: Phyllis2/ECN database, NREL Biomass Compositional Analysis publications,
 * stone fruit pruning biomass studies (BioResources), citrus pomace literature
 * (MDPI Polymers), eucalyptus wood composition (MDPI Energies), and general
 * agricultural residue reviews (ScienceDirect 2023).
 */

import type { CompositionData } from './composition-filters';

export const COMPOSITION_FALLBACKS: Record<string, Partial<CompositionData>> = {
  // --- Stone fruit prunings (very low ash, high HHV, air-dried woody) ---
  "Apples":             { moisture: 12, cellulose: 38,   lignin: 20,   ash: 2.5,  hhv: 18.8, hasData: true },
  "Apricots":           { moisture: 12, cellulose: 41,   lignin: 16.5, ash: 1.5,  hhv: 19.2, hasData: true },
  "Avocados":           { moisture: 14, cellulose: 40,   lignin: 22.5, ash: 3.0,  hhv: 19.0, hasData: true },
  "Cherries":           { moisture: 12, cellulose: 41,   lignin: 16,   ash: 1.0,  hhv: 19.2, hasData: true },
  "Peaches/Nectarines": { moisture: 12, cellulose: 42,   lignin: 17,   ash: 1.2,  hhv: 19.2, hasData: true },
  "Pears":              { moisture: 12, cellulose: 42,   lignin: 21,   ash: 2.2,  hhv: 19.2, hasData: true },
  "Plums":              { moisture: 12, cellulose: 42,   lignin: 17,   ash: 0.7,  hhv: 19.5, hasData: true },
  "Prunes":             { moisture: 12, cellulose: 42,   lignin: 17,   ash: 0.7,  hhv: 19.5, hasData: true },
  "Pomegranates":       { moisture: 13, cellulose: 42.5, lignin: 20,   ash: 2.0,  hhv: 19.2, hasData: true },
  "Kiwis":              { moisture: 13, cellulose: 38.3, lignin: 25.5, ash: 2.5,  hhv: 19.2, hasData: true },

  // --- Other tree crops ---
  "Pecans":                          { moisture:  8, cellulose: 28.5, lignin: 25.5, ash: 2.5, hhv: 19.5, hasData: true },
  "Dates":                           { moisture: 10, cellulose: 39,   lignin: 22.5, ash: 5.0, hhv: 18.5, hasData: true },
  "Eucalyptus":                      { moisture: 12, cellulose: 41.6, lignin: 27,   ash: 0.2, hhv: 18.2, hasData: true },
  "Miscellaneous Deciduous":         { moisture: 13, cellulose: 42.5, lignin: 25,   ash: 2.0, hhv: 19.5, hasData: true },
  "Miscellaneous Subtropical Fruits":{ moisture: 14, cellulose: 35,   lignin: 18.5, ash: 4.0, hhv: 18.2, hasData: true },

  // --- Soft fruit / berry / vine ---
  "Bush Berries":           { moisture: 14, cellulose: 41.5, lignin: 18.5, ash: 3.0, hhv: 19.0, hasData: true },
  "Strawberries":           { moisture: 70, cellulose: 27,   lignin: 10,   ash: 10,  hhv: 17.0, hasData: true },
  "Citrus and Subtropical": { moisture: 65, cellulose: 18,   lignin: 7.5,  ash: 4.0, hhv: 17.5, hasData: true },

  // --- Legumes / field crops ---
  "Beans (Dry)":               { moisture: 12, cellulose: 39.5, lignin: 14,   ash: 6.0, hhv: 18.5, hasData: true },
  "Miscellaneous Field Crops": { moisture: 13, cellulose: 39,   lignin: 16,   ash: 6.0, hhv: 18.5, hasData: true },
  "Miscellaneous Grain and Hay":{ moisture: 12, cellulose: 37.8, lignin: 19.8, ash: 3.7, hhv: 18.2, hasData: true },

  // --- Grasses / pasture (fresh/as-received, high moisture) ---
  "Miscellaneous Grasses":                   { moisture: 55, cellulose: 36.5, lignin: 11,  ash: 5.5, hhv: 17.5, hasData: true },
  "Mixed Pasture":                           { moisture: 60, cellulose: 36.5, lignin: 12,  ash: 6.5, hhv: 17.5, hasData: true },
  "Native Pasture":                          { moisture: 55, cellulose: 35,   lignin: 10,  ash: 8.0, hhv: 17.0, hasData: true },
  "Induced high water table native pasture": { moisture: 65, cellulose: 33,   lignin: 9,   ash: 9.0, hhv: 16.8, hasData: true },
  "Turf Farms":                              { moisture: 60, cellulose: 37.5, lignin: 10,  ash: 8.0, hhv: 17.0, hasData: true },

  // --- Vegetables / truck crops (high ash, lower HHV, very high moisture) ---
  "Carrots":                      { moisture: 75, cellulose: 12.5, lignin: 3,   ash: 10,   hhv: 17.0, hasData: true },
  "Cole Crops":                   { moisture: 75, cellulose: 20,   lignin: 10,  ash: 11.5, hhv: 16.5, hasData: true },
  "Lettuce/Leafy Greens":         { moisture: 78, cellulose: 15,   lignin: 6,   ash: 12.5, hhv: 16.0, hasData: true },
  "Melons, Squash and Cucumbers": { moisture: 75, cellulose: 21.5, lignin: 10,  ash: 10,   hhv: 17.0, hasData: true },
  "Miscellaneous Truck Crops":    { moisture: 70, cellulose: 23,   lignin: 11,  ash: 11.5, hhv: 17.0, hasData: true },
  "Onions and Garlic":            { moisture: 65, cellulose: 45.5, lignin: 7.2, ash: 6.5,  hhv: 17.2, hasData: true },
  "Peppers":                      { moisture: 70, cellulose: 24,   lignin: 12,  ash: 10,   hhv: 17.2, hasData: true },
  "Potatoes":                     { moisture: 75, cellulose: 24,   lignin: 8,   ash: 12.5, hhv: 16.5, hasData: true },
  "Sweet Potatoes":               { moisture: 72, cellulose: 25,   lignin: 9,   ash: 8.0,  hhv: 17.0, hasData: true },

  // --- Nursery / specialty ---
  "Flowers, Nursery and Christmas Tree Farms": { moisture: 55, cellulose: 40,   lignin: 21.5, ash: 3.5, hhv: 18.7, hasData: true },
  "Young Perennials":                          { moisture: 45, cellulose: 38.5, lignin: 21,   ash: 3.0, hhv: 18.5, hasData: true },

  // --- Idle / fallow / greenhouse (generic herbaceous residue) ---
  "Idle – Long Term":    { moisture: 12, cellulose: 36, lignin: 12.5, ash: 7.5,  hhv: 17.5, hasData: true },
  "Idle – Short Term":   { moisture: 20, cellulose: 34, lignin: 11,   ash: 8.0,  hhv: 17.2, hasData: true },
  "Unclassified Fallow": { moisture: 15, cellulose: 34, lignin: 12,   ash: 8.0,  hhv: 17.2, hasData: true },
  "Greenhouse":          { moisture: 65, cellulose: 25, lignin: 11,   ash: 12.5, hhv: 17.0, hasData: true },

  // --- API-mapped crops: fallback used when API returns hasData:false ---
  // HHV values match HHV_FALLBACKS in energy-calculations.ts (same source).
  // Composition values from Phyllis2/ECN, NREL, and published biomass residue studies.
  "Almonds":                   { moisture: 10, cellulose: 36, lignin: 16, ash:  4.0, hhv: 14.5, hasData: true }, // almond hulls
  "Walnuts":                   { moisture:  8, cellulose: 25, lignin: 54, ash:  1.5, hhv: 18.6, hasData: true }, // walnut shells
  "Pistachios":                { moisture:  8, cellulose: 27, lignin: 50, ash:  1.5, hhv: 20.1, hasData: true }, // pistachio shells
  "Rice":                      { moisture: 15, cellulose: 36, lignin: 12, ash: 14.0, hhv: 14.9, hasData: true }, // rice straw
  "Wild Rice":                 { moisture: 15, cellulose: 36, lignin: 12, ash: 14.0, hhv: 14.9, hasData: true }, // rice straw
  "Wheat":                     { moisture: 10, cellulose: 38, lignin: 20, ash:  5.0, hhv: 17.5, hasData: true }, // wheat straw
  "Cotton":                    { moisture: 10, cellulose: 28, lignin: 18, ash: 10.0, hhv: 16.0, hasData: true }, // cotton gin trash
  "Tomatoes":                  { moisture: 75, cellulose: 25, lignin: 18, ash:  7.0, hhv: 15.5, hasData: true }, // tomato pomace
  "Corn, Sorghum and Sudan":   { moisture: 15, cellulose: 37, lignin: 18, ash:  5.0, hhv: 17.4, hasData: true }, // corn stover
  "Sorghum":                   { moisture: 15, cellulose: 37, lignin: 18, ash:  5.0, hhv: 17.4, hasData: true }, // corn stover
  "Alfalfa & Alfalfa Mixtures":{ moisture: 15, cellulose: 32, lignin: 10, ash:  9.0, hhv: 17.0, hasData: true }, // alfalfa
  "Grapes":                    { moisture: 65, cellulose: 27, lignin: 29, ash:  6.0, hhv: 17.0, hasData: true }, // grape pomace
  "Olives":                    { moisture: 60, cellulose: 24, lignin: 20, ash:  2.0, hhv: 19.5, hasData: true }, // olive pomace
  "Barley":                    { moisture: 10, cellulose: 36, lignin: 17, ash:  6.0, hhv: 17.5, hasData: true }, // barley straw
  "Oats":                      { moisture: 10, cellulose: 37, lignin: 18, ash:  5.0, hhv: 17.3, hasData: true }, // oat straw
  "Safflower":                 { moisture: 10, cellulose: 38, lignin: 20, ash:  5.0, hhv: 17.2, hasData: true }, // safflower straw
  "Sunflowers":                { moisture: 15, cellulose: 37, lignin: 16, ash:  5.0, hhv: 17.0, hasData: true }, // sunflower stalk
  "Sugar beets":               { moisture: 80, cellulose: 25, lignin:  8, ash: 12.0, hhv: 14.0, hasData: true }, // sugar beet tops
};
