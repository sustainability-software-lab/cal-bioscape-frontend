import { test, expect } from '../fixtures/index';

// Regression test for issue #153: the LandIQ "Crop Field Details" popup must show
// compact AGGREGATE residue totals up top plus collapsible <details> sections, rather
// than one mile-tall flat list. Verified against a multi-residue crop (almonds), which
// has several residue streams (hulls, shells, prunings) and used to overflow the map.
//
// Canvas clicks are flaky in CI (see county-layer.spec.ts), so instead of a blind mouse
// click we query rendered feedstock features for an almond field, project its centroid to
// a pixel, and dispatch a real click there — deterministic and stable.

type MapboxLike = {
  loaded: () => boolean;
  isStyleLoaded: () => boolean;
  getLayer: (id: string) => unknown;
  jumpTo: (o: { center: [number, number]; zoom: number }) => void;
  once: (ev: string, cb: () => void) => void;
  queryRenderedFeatures: (
    geom?: unknown,
    opts?: { layers?: string[] }
  ) => Array<{ properties: Record<string, unknown>; geometry: { type: string; coordinates: unknown } }>;
  project: (lngLat: [number, number]) => { x: number; y: number };
  getCanvas: () => HTMLCanvasElement;
  getCanvasContainer: () => HTMLElement;
};

declare global {
  interface Window {
    mapboxMap?: MapboxLike;
  }
}

test('LandIQ crop field popup uses aggregate totals + collapsible sections (issue #153)', async ({
  page,
}) => {
  test.setTimeout(120_000);

  await page.goto('http://localhost:3100/');

  // Wait for the map + feedstock layer to be registered in the style.
  await page.waitForFunction(
    () => !!window.mapboxMap && !!window.mapboxMap.getLayer('feedstock-vector-layer'),
    { timeout: 60_000 }
  );

  // Drive the map to an almond field and dispatch a click on it. Returns diagnostics.
  const result = await page.evaluate(async () => {
    const map = window.mapboxMap!;
    const idle = () => new Promise<void>((r) => map.once('idle', () => r()));

    // Almond-dense centers across the San Joaquin Valley (Modesto/Merced/Madera/Fresno).
    const centers: Array<[number, number]> = [
      [-120.85, 37.5],
      [-120.45, 37.1],
      [-120.2, 36.95],
      [-119.95, 36.75],
      [-121.0, 37.65],
    ];

    const isAlmond = (props: Record<string, unknown>) => {
      const crop = String(props.main_crop_name ?? '').toLowerCase();
      const resources = String(props.resources ?? '').toLowerCase();
      return crop.includes('almond') || resources.includes('almond');
    };

    const centroidOf = (geom: { type: string; coordinates: any }): [number, number] | null => {
      let ring: number[][] | null = null;
      if (geom.type === 'Polygon') ring = geom.coordinates[0];
      else if (geom.type === 'MultiPolygon') ring = geom.coordinates[0][0];
      if (!ring || !ring.length) return null;
      let x = 0,
        y = 0;
      for (const c of ring) {
        x += c[0];
        y += c[1];
      }
      return [x / ring.length, y / ring.length];
    };

    for (const center of centers) {
      map.jumpTo({ center, zoom: 13 });
      await idle();
      const feats = map.queryRenderedFeatures(undefined, { layers: ['feedstock-vector-layer'] });
      const almond = feats.find((f) => isAlmond(f.properties));
      if (!almond) continue;

      const centroid = centroidOf(almond.geometry as any);
      if (!centroid) continue;
      const p = map.project(centroid);
      const rect = map.getCanvas().getBoundingClientRect();
      const clientX = rect.left + p.x;
      const clientY = rect.top + p.y;
      const target = map.getCanvasContainer();
      for (const type of ['mousedown', 'mouseup', 'click']) {
        target.dispatchEvent(
          new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY, button: 0 })
        );
      }
      return {
        clicked: true,
        cropName: String(almond.properties.main_crop_name ?? ''),
        resources: String(almond.properties.resources ?? ''),
        renderedCount: feats.length,
      };
    }
    return { clicked: false };
  });

  expect(result.clicked, 'should have found and clicked an almond feedstock field').toBe(true);

  // The popup must appear.
  const popup = page.locator('.mapboxgl-popup-content');
  await expect(popup).toBeVisible({ timeout: 15_000 });

  const popupText = (await popup.innerText()).toLowerCase();

  // Aggregate totals are visible WITHOUT expanding anything.
  await expect(popup).toContainText('Annual Crop Residue Estimates');
  expect(popupText).toContain('total wet');
  expect(popupText).toContain('total dry');

  // A collapsible <details> "Residue breakdown" section exists.
  const detailsCount = await popup.locator('details').count();
  expect(detailsCount, 'popup should contain at least one collapsible <details> section').toBeGreaterThan(0);

  const breakdown = popup.locator('details', { hasText: 'Residue breakdown' });
  await expect(breakdown).toHaveCount(1);

  // The breakdown is collapsed by default (not open).
  const openByDefault = await breakdown.evaluate((el) => (el as HTMLDetailsElement).open);
  expect(openByDefault, 'residue breakdown should be collapsed by default').toBe(false);

  // Evidence: compact, collapsed popup.
  const collapsedBox = await popup.boundingBox();
  await popup.screenshot({ path: 'e2e/__artifacts__/feedstock-popup-153-collapsed.png' });

  // Expanding it reveals MULTIPLE residue streams for almonds (hulls/shells/prunings...).
  await breakdown.locator('summary').click();
  await expect(breakdown).toContainText(/wet:/i);
  const wetRows = await breakdown.locator(':scope :text("Wet:")').count();
  // Almonds have several residue resources; at least 2 distinct streams expected.
  expect(wetRows, 'almond residue breakdown should list multiple residue types').toBeGreaterThanOrEqual(2);

  // Evidence: expanded popup showing the multiple almond residue types.
  await popup.screenshot({ path: 'e2e/__artifacts__/feedstock-popup-153-expanded.png' });

  // Sanity: collapsed popup is reasonably short (not a mile tall).
  expect(collapsedBox, 'popup should have a measurable box').not.toBeNull();
  expect(collapsedBox!.height, 'collapsed popup should be compact (< 320px tall)').toBeLessThan(320);
});
