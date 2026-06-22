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

// Regression test for issue #100: the page seeds the county-stats cache from the
// precomputed static snapshot on load, so popups never hit the slow backend per
// session. We assert (a) the snapshot asset is fetched on load, and (b) no live
// county USDA proxy requests fire on load (the warm comes from the static file).
test('seeds the county stats cache from the static snapshot on load (issue #100)', async ({ page }) => {
  let snapshotFetched = false;
  const liveCountyGeoids = new Set<string>();
  page.on('request', req => {
    const url = req.url();
    if (url.includes('/data/county-stats-snapshot.json')) snapshotFetched = true;
    const match = url.match(/\/api\/proxy\/.*\/usda\/.*\/geoid\/(\d{5})\//);
    if (match) liveCountyGeoids.add(match[1]);
  });

  await page.goto('/');

  // The static snapshot is fetched on mount...
  await expect.poll(() => snapshotFetched, { timeout: 25000 }).toBe(true);
  // ...and no live per-county USDA queries fire on load (popups read the snapshot).
  await page.waitForTimeout(3000);
  expect(liveCountyGeoids.size).toBe(0);
});
