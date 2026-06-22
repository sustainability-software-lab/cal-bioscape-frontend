import { test, expect } from '../fixtures/index';

// Popup-content assertion (clicking a WebGL county polygon) is left to manual
// Verification due to flakiness of canvas interactions in CI.
test('enabling the County Level Stats layer disables the feedstock layer', async ({ page }) => {
  await page.goto('/');

  // Feedstock toggle is on by default
  const feedstockToggle = page.getByTestId('layer-checkbox-feedstock');
  const countyToggle = page.getByTestId('layer-checkbox-county');

  await expect(feedstockToggle).toBeChecked({ timeout: 15000 });
  await expect(countyToggle).not.toBeChecked();

  // Enable county layer -> feedstock must turn off
  await countyToggle.click();
  await expect(countyToggle).toBeChecked();
  await expect(feedstockToggle).not.toBeChecked();

  // Enable feedstock again -> county must turn off
  await feedstockToggle.click();
  await expect(feedstockToggle).toBeChecked();
  await expect(countyToggle).not.toBeChecked();
});

// Regression test for issue #89: county-layer Mapbox visibility must follow the checkbox.
// The prior bug: directLayerToggle failed to call onLayerToggle when the Mapbox layer
// wasn't yet registered (map load event not yet fired), leaving layerVisibility.county=false
// in parent state so the Map.js effect never made the layer visible.
test('county Mapbox layers become visible when the checkbox is enabled', async ({ page }) => {
  await page.goto('/');

  const countyToggle = page.getByTestId('layer-checkbox-county');
  await expect(countyToggle).not.toBeChecked({ timeout: 15000 });

  // Wait for the map to finish loading so county-layer is registered in the style.
  await page.waitForFunction(
    () =>
      !!(window as { mapboxMap?: { getLayer: (id: string) => unknown } }).mapboxMap &&
      !!(window as { mapboxMap?: { getLayer: (id: string) => unknown } }).mapboxMap!.getLayer('county-layer'),
    { timeout: 30000 }
  );

  // Click the county checkbox
  await countyToggle.click();
  await expect(countyToggle).toBeChecked();

  // Both Mapbox layers must be visible after the toggle
  const countyLayerVisibility = await page.evaluate(() =>
    (window as { mapboxMap?: { getLayoutProperty: (id: string, prop: string) => string } })
      .mapboxMap?.getLayoutProperty('county-layer', 'visibility')
  );
  expect(countyLayerVisibility).toBe('visible');

  const countyOutlineVisibility = await page.evaluate(() =>
    (window as { mapboxMap?: { getLayoutProperty: (id: string, prop: string) => string } })
      .mapboxMap?.getLayoutProperty('county-outline', 'visibility')
  );
  expect(countyOutlineVisibility).toBe('visible');

  // Disabling the county layer must hide both Mapbox layers
  await countyToggle.click();
  await expect(countyToggle).not.toBeChecked();

  const countyLayerHidden = await page.evaluate(() =>
    (window as { mapboxMap?: { getLayoutProperty: (id: string, prop: string) => string } })
      .mapboxMap?.getLayoutProperty('county-layer', 'visibility')
  );
  expect(countyLayerHidden).toBe('none');
});

// Regression test for issue #100: the page warms the county-stats cache on load
// so the first county click is served from memory. We assert the browser fires
// county USDA proxy requests for multiple counties WITHOUT any county click —
// proving the idle prefetch sweep runs (and is not a single on-demand fetch).
// Backend availability is irrelevant: we only assert the browser->proxy request
// is issued, not its response.
test('warms the county stats cache on page load without a click (issue #100)', async ({ page }) => {
  const countyGeoids = new Set<string>();
  page.on('request', req => {
    const match = req.url().match(/\/api\/proxy\/.*\/usda\/.*\/geoid\/(\d{5})\//);
    if (match) countyGeoids.add(match[1]);
  });

  await page.goto('/');

  // Prefetch is idle-scheduled (requestIdleCallback / setTimeout fallback), so
  // give it time to issue requests for more than one county.
  await expect.poll(() => countyGeoids.size, { timeout: 25000 }).toBeGreaterThan(1);
});
