/**
 * Literature-based fallback biomass composition values for LandIQ crop types
 * that are not covered by the Cal BioScape API (i.e., not in LANDIQ_TO_API_RESOURCE).
 *
 * All values are on a dry basis:
 *   - cellulose, lignin, ash: % (w/w dry)
 *   - hhv: MJ/kg (higher heating value)
 *
 * Sources: Phyllis2/ECN database, NREL Biomass Compositional Analysis publications,
 * stone fruit pruning biomass studies (BioResources), citrus pomace literature
 * (MDPI Polymers), eucalyptus wood composition (MDPI Energies), and general
 * agricultural residue reviews (ScienceDirect 2023).
 */

import type { CompositionData } from './composition-filters';

export const COMPOSITION_FALLBACKS: Record<string, Partial<CompositionData>> = {
  // --- Stone fruit prunings (very low ash, high HHV) ---
  "Apples":             { cellulose: 38,   lignin: 20,   ash: 2.5,  hhv: 18.8, hasData: true },
  "Apricots":           { cellulose: 41,   lignin: 16.5, ash: 1.5,  hhv: 19.2, hasData: true },
  "Avocados":           { cellulose: 40,   lignin: 22.5, ash: 3.0,  hhv: 19.0, hasData: true },
  "Cherries":           { cellulose: 41,   lignin: 16,   ash: 1.0,  hhv: 19.2, hasData: true },
  "Peaches/Nectarines": { cellulose: 42,   lignin: 17,   ash: 1.2,  hhv: 19.2, hasData: true },
  "Pears":              { cellulose: 42,   lignin: 21,   ash: 2.2,  hhv: 19.2, hasData: true },
  "Plums":              { cellulose: 42,   lignin: 17,   ash: 0.7,  hhv: 19.5, hasData: true },
  "Prunes":             { cellulose: 42,   lignin: 17,   ash: 0.7,  hhv: 19.5, hasData: true },
  "Pomegranates":       { cellulose: 42.5, lignin: 20,   ash: 2.0,  hhv: 19.2, hasData: true },
  "Kiwis":              { cellulose: 38.3, lignin: 25.5, ash: 2.5,  hhv: 19.2, hasData: true },

  // --- Other tree crops ---
  "Pecans":                          { cellulose: 28.5, lignin: 25.5, ash: 2.5, hhv: 19.5, hasData: true },
  "Dates":                           { cellulose: 39,   lignin: 22.5, ash: 5.0, hhv: 18.5, hasData: true },
  "Eucalyptus":                      { cellulose: 41.6, lignin: 27,   ash: 0.2, hhv: 18.2, hasData: true },
  "Miscellaneous Deciduous":         { cellulose: 42.5, lignin: 25,   ash: 2.0, hhv: 19.5, hasData: true },
  "Miscellaneous Subtropical Fruits":{ cellulose: 35,   lignin: 18.5, ash: 4.0, hhv: 18.2, hasData: true },

  // --- Soft fruit / berry / vine ---
  "Bush Berries":           { cellulose: 41.5, lignin: 18.5, ash: 3.0, hhv: 19.0, hasData: true },
  "Strawberries":           { cellulose: 27,   lignin: 10,   ash: 10,  hhv: 17.0, hasData: true },
  "Citrus and Subtropical": { cellulose: 18,   lignin: 7.5,  ash: 4.0, hhv: 17.5, hasData: true },

  // --- Legumes / field crops ---
  "Beans (Dry)":               { cellulose: 39.5, lignin: 14,   ash: 6.0, hhv: 18.5, hasData: true },
  "Miscellaneous Field Crops": { cellulose: 39,   lignin: 16,   ash: 6.0, hhv: 18.5, hasData: true },
  "Miscellaneous Grain and Hay":{ cellulose: 37.8, lignin: 19.8, ash: 3.7, hhv: 18.2, hasData: true },

  // --- Grasses / pasture ---
  "Miscellaneous Grasses":                   { cellulose: 36.5, lignin: 11,  ash: 5.5, hhv: 17.5, hasData: true },
  "Mixed Pasture":                           { cellulose: 36.5, lignin: 12,  ash: 6.5, hhv: 17.5, hasData: true },
  "Native Pasture":                          { cellulose: 35,   lignin: 10,  ash: 8.0, hhv: 17.0, hasData: true },
  "Induced high water table native pasture": { cellulose: 33,   lignin: 9,   ash: 9.0, hhv: 16.8, hasData: true },
  "Turf Farms":                              { cellulose: 37.5, lignin: 10,  ash: 8.0, hhv: 17.0, hasData: true },

  // --- Vegetables / truck crops (high ash, lower HHV) ---
  "Carrots":                      { cellulose: 12.5, lignin: 3,   ash: 10,   hhv: 17.0, hasData: true },
  "Cole Crops":                   { cellulose: 20,   lignin: 10,  ash: 11.5, hhv: 16.5, hasData: true },
  "Lettuce/Leafy Greens":         { cellulose: 15,   lignin: 6,   ash: 12.5, hhv: 16.0, hasData: true },
  "Melons, Squash and Cucumbers": { cellulose: 21.5, lignin: 10,  ash: 10,   hhv: 17.0, hasData: true },
  "Miscellaneous Truck Crops":    { cellulose: 23,   lignin: 11,  ash: 11.5, hhv: 17.0, hasData: true },
  "Onions and Garlic":            { cellulose: 45.5, lignin: 7.2, ash: 6.5,  hhv: 17.2, hasData: true },
  "Peppers":                      { cellulose: 24,   lignin: 12,  ash: 10,   hhv: 17.2, hasData: true },
  "Potatoes":                     { cellulose: 24,   lignin: 8,   ash: 12.5, hhv: 16.5, hasData: true },
  "Sweet Potatoes":               { cellulose: 25,   lignin: 9,   ash: 8.0,  hhv: 17.0, hasData: true },

  // --- Nursery / specialty ---
  "Flowers, Nursery and Christmas Tree Farms": { cellulose: 40,   lignin: 21.5, ash: 3.5, hhv: 18.7, hasData: true },
  "Young Perennials":                          { cellulose: 38.5, lignin: 21,   ash: 3.0, hhv: 18.5, hasData: true },

  // --- Idle / fallow / greenhouse (generic herbaceous residue) ---
  "Idle – Long Term":    { cellulose: 36, lignin: 12.5, ash: 7.5,  hhv: 17.5, hasData: true },
  "Idle – Short Term":   { cellulose: 34, lignin: 11,   ash: 8.0,  hhv: 17.2, hasData: true },
  "Unclassified Fallow": { cellulose: 34, lignin: 12,   ash: 8.0,  hhv: 17.2, hasData: true },
  "Greenhouse":          { cellulose: 25, lignin: 11,   ash: 12.5, hhv: 17.0, hasData: true },
};
