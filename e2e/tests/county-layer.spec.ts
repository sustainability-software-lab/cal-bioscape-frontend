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
