import { test, expect } from '../fixtures/index';

test('home page loads and layer controls are visible', async ({ page }) => {
  await page.goto('/');
  // The feedstock layer checkbox is always rendered in the sidebar
  await expect(page.locator('#feedstockLayer')).toBeVisible({ timeout: 15000 });
});
