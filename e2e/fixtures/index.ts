import { test } from '@playwright/test';

export { test, expect } from '@playwright/test';

// Map regressions exercise returning users; first-visit research journeys use test.
export const returningUserTest = test.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => localStorage.setItem('calbioscape:user-research:v1', 'submitted'));
    await use(page);
  },
});
