/**
 * Layer key pairs that are mutually exclusive (toggling one on turns the other off).
 */
export const MUTUALLY_EXCLUSIVE_LAYERS: [string, string][] = [
  ['feedstock', 'county'],
];

/**
 * Pure helper: applies mutual-exclusivity logic when a layer toggle changes.
 * Returns a new visibility object with the toggled layer set to isVisible,
 * and its exclusive partner set to false when isVisible is true.
 */
export function applyLayerMutualExclusivity(
  visibility: Record<string, boolean>,
  layerId: string,
  isVisible: boolean
): Record<string, boolean> {
  const next = { ...visibility, [layerId]: isVisible };

  if (isVisible) {
    for (const [a, b] of MUTUALLY_EXCLUSIVE_LAYERS) {
      if (layerId === a) next[b] = false;
      else if (layerId === b) next[a] = false;
    }
  }

  return next;
}
