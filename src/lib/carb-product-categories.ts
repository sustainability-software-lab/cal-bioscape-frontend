// Disaggregation of the CARB food-processor tileset by `primary_ag_product`.
//
// The CARB tileset (`sustainasoft.carb-food-processors-*`, source layer
// `carb_food_processors`) is a single dataset that carries a `primary_ag_product`
// property on every feature. Issue #98 asks for this single layer to be split
// into individually-toggleable, color-coded legend entries keyed by that product.
//
// This module is the single source of truth for that split: Map.js builds one
// filtered Mapbox circle layer per entry, LayerControls renders one legend
// checkbox per entry, and page.tsx seeds one visibility key per entry. The
// `product` value must match the tileset's `primary_ag_product` string exactly
// (the build pipeline in carb-food-processors-build.ts trims but does not
// otherwise transform it).

export interface CarbProductCategory {
  /** Logical visibility key used in layerVisibility state (e.g. 'carbWine'). */
  key: string;
  /** Exact `primary_ag_product` value in the tileset (the Mapbox filter value). */
  product: string;
  /** Human-readable legend label. */
  label: string;
  /** Distinct legend/marker color. */
  color: string;
  /** Mapbox layer id for this category's filtered circle layer. */
  mapboxLayerId: string;
}

// Ordered most-common first (matches the source dataset distribution). Colors are
// chosen to be visually distinct across the set.
export const CARB_PRODUCT_CATEGORIES: CarbProductCategory[] = [
  { key: 'carbWine', product: 'Wine', label: 'Wine', color: '#9333EA', mapboxLayerId: 'carb-food-processors-wine-layer' },
  { key: 'carbAlmonds', product: 'Almonds', label: 'Almonds', color: '#F97316', mapboxLayerId: 'carb-food-processors-almonds-layer' },
  { key: 'carbWalnut', product: 'Walnut', label: 'Walnut', color: '#7C2D12', mapboxLayerId: 'carb-food-processors-walnut-layer' },
  { key: 'carbTomatoes', product: 'Tomatoes', label: 'Tomatoes', color: '#DC2626', mapboxLayerId: 'carb-food-processors-tomatoes-layer' },
  { key: 'carbCotton', product: 'Cotton', label: 'Cotton', color: '#0EA5E9', mapboxLayerId: 'carb-food-processors-cotton-layer' },
  { key: 'carbPistachio', product: 'Pistachio', label: 'Pistachio', color: '#16A34A', mapboxLayerId: 'carb-food-processors-pistachio-layer' },
  { key: 'carbPotato', product: 'Potato', label: 'Potato', color: '#92400E', mapboxLayerId: 'carb-food-processors-potato-layer' },
  { key: 'carbWheat', product: 'Wheat', label: 'Wheat', color: '#CA8A04', mapboxLayerId: 'carb-food-processors-wheat-layer' },
  { key: 'carbCorn', product: 'Corn', label: 'Corn', color: '#FACC15', mapboxLayerId: 'carb-food-processors-corn-layer' },
  { key: 'carbRice', product: 'Rice', label: 'Rice', color: '#0D9488', mapboxLayerId: 'carb-food-processors-rice-layer' },
];

/** Logical visibility keys for all CARB product categories. */
export const CARB_PRODUCT_KEYS: string[] = CARB_PRODUCT_CATEGORIES.map((c) => c.key);

/** Canonical label-mapping / popup key shared by every CARB sub-layer. */
export const CARB_POPUP_LABEL_KEY = 'carb-food-processors';

/** True if the Mapbox layer id belongs to a CARB product sub-layer. */
export function isCarbProductLayerId(mapboxLayerId: string): boolean {
  return mapboxLayerId.startsWith('carb-food-processors-') && mapboxLayerId.endsWith('-layer');
}
