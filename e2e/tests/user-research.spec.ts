import { test, expect } from '../fixtures/index';

test.beforeEach(async ({ page }) => {
  // These journeys exercise the poll independently of live backend data.
  await page.route('**/api/proxy/**', route => route.fulfill({ status: 404, json: {} }));
});

test('invitation is optional, can be dismissed, and stays dismissed after reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Share your input' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('#feedstockLayer')).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss research invitation' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Share your input' })).toHaveCount(0);
  await expect(page.locator('#feedstockLayer')).toBeVisible();
});

test('failed submission retains answers and retry identity, and success suppresses invitation', async ({ page }) => {
  const submissions: Record<string, unknown>[] = [];
  await page.addInitScript(() => localStorage.setItem('calbioscape:user-research:v1:pending-id', '------------------------------------'));
  await page.route('**/api/user-research', async route => {
    submissions.push(route.request().postDataJSON());
    await route.fulfill(submissions.length === 1
      ? { status: 503, json: { error: 'Unavailable' } }
      : { status: 201, json: { success: true } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Share your input' }).click();
  await page.getByLabel('Your role').selectOption('researcher');
  await page.getByLabel('Affiliation').fill('Example university');
  await page.getByLabel('What are you hoping to accomplish with Cal BioScape?').fill('Compare agricultural residues near a potential facility.');
  await page.getByRole('button', { name: 'Send feedback' }).click();
  await expect(page.getByRole('alert')).toContainText('couldn’t save');
  await expect(page.getByLabel('Affiliation')).toHaveValue('Example university');
  await page.getByRole('button', { name: 'Send feedback' }).click();
  await expect(page.getByText('Thanks for sharing your perspective.')).toBeVisible();
  expect(submissions).toHaveLength(2);
  expect(submissions[0].submissionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  expect(submissions[1].submissionId).toBe(submissions[0].submissionId);
  expect(submissions[1]).toMatchObject({ role: 'researcher', email: null, allowFollowUp: false, version: 1 });
  await page.getByRole('button', { name: 'Back to the map' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Share your input' })).toHaveCount(0);
});

test('Other role and follow-up are explicit choices and the form fits a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let submitted: Record<string, unknown> | null = null;
  await page.route('**/api/user-research', async route => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: { success: true } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Share your input' }).click();
  const dialog = page.getByRole('dialog');
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await page.getByLabel('Your role').selectOption('other');
  await page.getByLabel('Describe your role').fill('Community organizer');
  await page.getByLabel('What are you hoping to accomplish with Cal BioScape?').fill('Understand local opportunities.');
  await expect(page.getByLabel('Email address')).toHaveCount(0);
  await page.getByLabel('I’m open to a follow-up conversation').check();
  await page.getByLabel('Email address').fill('example@example.org');
  await page.getByRole('button', { name: 'Send feedback' }).click();
  await expect(page.getByText('Thanks for sharing your perspective.')).toBeVisible();
  expect(submitted).toMatchObject({ role: 'other', otherRole: 'Community organizer', allowFollowUp: true, email: 'example@example.org' });
});

test('blocked browser storage does not prevent sending or dismissing', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
  });
  await page.route('**/api/user-research', route => route.fulfill({ status: 201, json: { success: true } }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Share your input' }).click();
  await page.getByLabel('Your role').selectOption('grower');
  await page.getByLabel('What are you hoping to accomplish with Cal BioScape?').fill('Find nearby processors.');
  await page.getByRole('button', { name: 'Send feedback' }).click();
  await expect(page.getByText('Thanks for sharing your perspective.')).toBeVisible();
  await page.getByRole('button', { name: 'Back to the map' }).click();
  await expect(page.getByRole('button', { name: 'Share your input' })).toHaveCount(0);
});

test('dismissed invitation remains available from Contact and Escape returns focus', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Dismiss research invitation' }).click();
  await page.goto('/contact');
  const trigger = page.getByRole('button', { name: 'Share your input' });
  await trigger.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.getByRole('link', { name: 'Team admin' })).toHaveAttribute('href', '/admin');
});

test('a saved response conflict requires an explicit choice before making a new submission', async ({ page }) => {
  const submissions: Record<string, unknown>[] = [];
  await page.route('**/api/user-research', async route => {
    submissions.push(route.request().postDataJSON());
    await route.fulfill(submissions.length === 1 ? { status: 409, json: { error: 'Already saved' } } : { status: 201, json: { success: true } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Share your input' }).click();
  await page.getByLabel('Your role').selectOption('software');
  await page.getByLabel('What are you hoping to accomplish with Cal BioScape?').fill('Build a resource data integration.');
  await page.getByRole('button', { name: 'Send feedback' }).click();
  await expect(page.getByRole('alert')).toContainText('earlier response was saved');
  expect(submissions).toHaveLength(1);
  await page.getByRole('button', { name: 'Send as a new response' }).click();
  await expect(page.getByText('Thanks for sharing your perspective.')).toBeVisible();
  expect(submissions).toHaveLength(2);
  expect(submissions[1].submissionId).not.toBe(submissions[0].submissionId);
});

test('team view requires login, supports pagination and page export, and clears on session expiry', async ({ page }) => {
  let loggedIn = false;
  let expired = false;
  const responses = [{ id: 'test-1', createdAt: '2026-09-29T18:00:00.000Z', version: 1, role: 'researcher', otherRole: null, affiliation: 'Example university', goal: 'Find feedstock near candidate sites.', email: null, allowFollowUp: false }];
  await page.route('**/api/admin/login', async route => {
    loggedIn = true;
    await route.fulfill({ json: { success: true } });
  });
  await page.route('**/api/admin/user-research**', async route => {
    if (!loggedIn || expired) return route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/export')) return route.fulfill({ contentType: 'text/csv', body: 'role,goal\nresearcher,Find feedstock\n' });
    return route.fulfill({ json: url.searchParams.has('cursor')
      ? { responses: [{ ...responses[0], id: 'test-2', role: 'grower', affiliation: 'Example farm' }], nextCursor: null }
      : { responses, nextCursor: 'next-page' } });
  });
  await page.goto('/admin');
  await page.getByLabel('Username').fill('team');
  await page.getByLabel('Password').fill('example-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Example university', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByText('Example farm', { exact: true })).toBeVisible();
  await expect(page.getByText('Example university', { exact: true })).toHaveCount(0);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export this page' }).click();
  await expect((await download).suggestedFilename()).toMatch(/user-research.*\.csv$/);
  expired = true;
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByText('Example farm', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('alert').filter({ hasText: 'session' })).toBeVisible();
});

test('team sign-in and shared navigation fit a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/admin/user-research', route => route.fulfill({ status: 401, json: { error: 'Unauthorized' } }));
  await page.goto('/admin');
  await expect(page.getByLabel('Password')).toBeVisible();
  const contactBounds = await page.getByRole('link', { name: 'Contact', exact: true }).boundingBox();
  expect(contactBounds).not.toBeNull();
  expect(contactBounds!.x + contactBounds!.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
