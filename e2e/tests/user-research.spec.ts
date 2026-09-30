import { test, expect } from '../fixtures/index';
import type { Page } from '@playwright/test';

async function selectRole(page: Page, label: string) {
  // Wait for the dialog's initial focus before opening its nested select.
  await expect(page.getByRole('heading', { name: 'Help us improve Cal BioScape', exact: true })).toBeFocused();
  await page.getByRole('combobox', { name: 'Your role' }).click();
  await page.getByRole('option', { name: label, exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  // These journeys exercise the poll independently of live backend data.
  await page.route('**/api/proxy/**', route => route.fulfill({ status: 404, json: {} }));
});

test('first visit requires affiliation and role and cannot be dismissed before saving', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Help us improve Cal BioScape', exact: true })).toBeFocused();
  await expect(page.getByText('Your responses will only be shared with the Cal BioScape development team.', { exact: true })).toBeVisible();
  await expect(page.getByText('Thank you for helping us improve the tool.', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog').getByText('(optional)', { exact: true })).toHaveCount(0);
  const affiliation = page.getByRole('textbox', { name: 'Institution/Affiliation', exact: true });
  await expect(affiliation).toHaveAttribute('placeholder', 'e.g., Lawrence Berkeley National Lab');
  await expect(affiliation).toHaveAttribute('required', '');
  await expect(page.getByRole('dialog').locator('form input').first()).toHaveAttribute('id', 'research-affiliation');
  await expect(page.getByRole('button', { name: 'Share your input' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Close', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Maybe later' })).toHaveCount(0);
  await expect(page.getByText('What brings you here?', { exact: false })).toHaveCount(0);
  const explore = page.getByRole('button', { name: 'Explore the tool' });
  await expect(explore).toBeDisabled();
  await explore.locator('..').hover();
  await expect(page.getByRole('tooltip')).toHaveText('Please indicate your affiliation and role.');
  await affiliation.fill('Example university');
  await explore.locator('..').hover();
  await expect(page.getByRole('tooltip')).toHaveText('Please indicate your affiliation and role.');
  await expect(explore.locator('..')).not.toHaveAttribute('title', 'Please indicate your affiliation and role.');
  await page.mouse.move(5, 5);
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await explore.locator('..').focus();
  await expect(page.getByRole('tooltip')).toHaveText('Please indicate your affiliation and role.');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(page.getByRole('dialog')).toBeVisible();
  const roleSelect = page.getByRole('combobox', { name: 'Your role' });
  await expect(roleSelect).toHaveText('Please select the closest fit');
  await roleSelect.click();
  await expect(page.getByRole('listbox')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect.poll(async () => {
    const trigger = (await page.locator('#research-role').boundingBox())!;
    const menu = (await page.getByRole('listbox').boundingBox())!;
    return Math.min(Math.abs(menu.y - trigger.y - trigger.height), Math.abs(trigger.y - menu.y - menu.height));
  }).toBeLessThanOrEqual(1);
  await expect(page.getByRole('option', { name: 'Policy professional', exact: true })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Farmer / Grower', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toBeVisible();
  await roleSelect.press('Enter');
  await expect(page.getByRole('option', { name: 'Researcher / Student', exact: true })).toBeFocused();
  await page.keyboard.type('Policy', { delay: 50 });
  await expect(page.getByRole('option', { name: 'Policy professional', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(roleSelect).toHaveText('Policy professional');
  await expect(explore).toBeEnabled();
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await affiliation.fill('   ');
  await expect(explore).toBeDisabled();
  await explore.locator('..').hover();
  await expect(page.getByRole('tooltip')).toHaveText('Please indicate your affiliation and role.');
  await affiliation.fill('Example university');
  await expect(explore).toBeEnabled();
  await expect(page.getByRole('tooltip')).toHaveCount(0);
});

test('failed submission retains answers and retry identity, and success suppresses the modal', async ({ page }) => {
  const submissions: Record<string, unknown>[] = [];
  await page.addInitScript(() => localStorage.setItem('calbioscape:user-research:v1:pending-id', '------------------------------------'));
  await page.route('**/api/user-research', async route => {
    submissions.push(route.request().postDataJSON());
    await route.fulfill(submissions.length === 1
      ? { status: 503, json: { error: 'Unavailable' } }
      : { status: 201, json: { success: true } });
  });
  await page.goto('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  await selectRole(page, 'Researcher / Student');
  await page.getByRole('textbox', { name: 'Institution/Affiliation', exact: true }).fill('Example university');
  await page.getByLabel('What are you hoping to accomplish with Cal BioScape?').fill('Compare agricultural residues near a potential facility.');
  await page.getByRole('button', { name: 'Explore the tool' }).click();
  await expect(page.getByRole('alert')).toContainText('couldn’t save');
  await expect(page.getByRole('textbox', { name: 'Institution/Affiliation', exact: true })).toHaveValue('Example university');
  await page.getByRole('button', { name: 'Explore the tool' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(submissions).toHaveLength(2);
  expect(submissions[0].submissionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  expect(submissions[1].submissionId).toBe(submissions[0].submissionId);
  expect(submissions[1]).toMatchObject({ role: 'researcher', email: null, allowFollowUp: false, version: 1 });
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('Other role and updates are explicit choices and the form fits a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let submitted: Record<string, unknown> | null = null;
  await page.route('**/api/user-research', async route => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: { success: true } });
  });
  await page.goto('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  const dialog = page.getByRole('dialog');
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: 'Explore the tool' }).locator('..').hover();
  await expect(page.getByRole('tooltip')).toHaveText('Please indicate your affiliation and role.');
  const tooltipBounds = (await page.getByRole('tooltip').locator('..').boundingBox())!;
  expect(tooltipBounds.x).toBeGreaterThanOrEqual(16);
  expect(tooltipBounds.x + tooltipBounds.width).toBeLessThanOrEqual(374);
  await page.mouse.move(5, 5);
  await selectRole(page, 'Other');
  await page.getByRole('textbox', { name: 'Institution/Affiliation', exact: true }).fill('  Example university  ');
  await page.getByLabel('Describe your role').fill('Community organizer');
  await page.getByLabel('What are you hoping to accomplish with Cal BioScape?').fill('Understand local opportunities.');
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.getByLabel("I'd like to stay informed about tool updates.")).toHaveCount(0);
  await expect(page.getByLabel('I’m open to a follow-up conversation')).toHaveCount(0);
  await page.getByLabel('Email address').fill('example@example.org');
  await page.getByLabel("I'd like to stay informed about tool updates.").check();
  await expect(page.getByLabel('I’m open to a follow-up conversation')).toHaveCount(0);
  await expect(page.getByRole('dialog').getByRole('checkbox')).toHaveCount(1);
  await page.getByRole('button', { name: 'Explore the tool' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(submitted).toMatchObject({ role: 'other', otherRole: 'Community organizer', allowUpdates: true, allowFollowUp: false, email: 'example@example.org' });
});

test('blocked browser storage still allows saving and suppresses the modal for this visit', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
  });
  await page.route('**/api/user-research', route => route.fulfill({ status: 201, json: { success: true } }));
  await page.goto('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  await selectRole(page, 'Farmer / Grower');
  await page.getByRole('textbox', { name: 'Institution/Affiliation', exact: true }).fill('  Example university  ');
  await page.getByLabel('What are you hoping to accomplish with Cal BioScape?').fill('Find nearby processors.');
  await page.getByRole('button', { name: 'Explore the tool' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Share your input' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Contact', exact: true }).click();
  await page.getByRole('link', { name: 'Map', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('an older dismissed marker does not bypass the required role response', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('calbioscape:user-research:v1', 'dismissed'));
  await page.goto('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Explore the tool' })).toBeDisabled();
});

test('affiliation and role save without optional answers and returns directly to the map', async ({ page }) => {
  let submitted: Record<string, unknown> | null = null;
  await page.route('**/api/user-research', async route => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: { success: true } });
  });
  await page.goto('/');
  await selectRole(page, 'Researcher / Student');
  await page.getByRole('textbox', { name: 'Institution/Affiliation', exact: true }).fill('  Example university  ');
  await page.getByRole('button', { name: 'Explore the tool' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(submitted).toMatchObject({ role: 'researcher', affiliation: 'Example university', goal: '', email: null, allowUpdates: false, allowFollowUp: false });
  await expect(page.locator('#feedstockLayer')).toBeVisible();
});

test('optional email is saved independently and consent resets when the address becomes invalid', async ({ page }) => {
  const submissions: Record<string, unknown>[] = [];
  await page.route('**/api/user-research', async route => {
    submissions.push(route.request().postDataJSON());
    await route.fulfill({ status: 201, json: { success: true } });
  });
  await page.goto('/');
  await selectRole(page, 'Consultant');
  await page.getByRole('textbox', { name: 'Institution/Affiliation', exact: true }).fill('  Example university  ');
  const email = page.getByLabel('Email address');
  const consent = page.getByLabel('I’m open to a follow-up conversation');
  const updates = page.getByLabel("I'd like to stay informed about tool updates.");
  await expect(email).toBeVisible();
  await expect(updates).toHaveCount(0);
  await expect(consent).toHaveCount(0);
  await email.fill('one@example.org');
  await updates.check();
  await expect(consent).toHaveCount(0);
  await email.fill('invalid');
  await expect(consent).toHaveCount(0);
  await expect(updates).toHaveCount(0);
  await page.getByRole('button', { name: 'Explore the tool' }).click();
  expect(await email.evaluate(input => (input as HTMLInputElement).validity.valid)).toBe(false);
  expect(submissions).toHaveLength(0);
  await email.fill('two@example.org');
  await expect(consent).toHaveCount(0);
  await expect(updates).not.toBeChecked();
  await updates.check();
  await expect(consent).toHaveCount(0);
  await updates.uncheck();
  await expect(email).toHaveValue('two@example.org');
  await expect(consent).toHaveCount(0);
  await email.fill('');
  await expect(consent).toHaveCount(0);
  await expect(updates).toHaveCount(0);
  await email.fill('two@example.org');
  await expect(consent).toHaveCount(0);
  await expect(updates).not.toBeChecked();
  await page.getByRole('button', { name: 'Explore the tool' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(submissions).toHaveLength(1);
  expect(submissions[0]).toMatchObject({ email: 'two@example.org', allowUpdates: false, allowFollowUp: false, goal: '' });
});

test('completed users can reopen from Contact and save an Other role without extra details', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('calbioscape:user-research:v1', 'submitted'));
  let submitted: Record<string, unknown> | null = null;
  await page.route('**/api/user-research', async route => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: { success: true } });
  });
  await page.goto('/');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: 'Contact', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Team admin' })).toHaveAttribute('href', '/admin');
  await page.getByRole('button', { name: 'Share your input' }).click();
  await expect(page.getByRole('heading', { name: 'Help us improve Cal BioScape', exact: true })).toBeFocused();
  await selectRole(page, 'Other');
  await page.getByRole('textbox', { name: 'Institution/Affiliation', exact: true }).fill('  Example university  ');
  await page.getByRole('button', { name: 'Explore the tool' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(submitted).toMatchObject({ role: 'other', affiliation: 'Example university', otherRole: '', goal: '', email: null });
});

test('a saved response conflict requires an explicit choice before making a new submission', async ({ page }) => {
  const submissions: Record<string, unknown>[] = [];
  await page.route('**/api/user-research', async route => {
    submissions.push(route.request().postDataJSON());
    await route.fulfill(submissions.length === 1 ? { status: 409, json: { error: 'Already saved' } } : { status: 201, json: { success: true } });
  });
  await page.goto('/');
  await expect(page.getByRole('dialog')).toBeVisible();
  await selectRole(page, 'Software / Data professional');
  await page.getByRole('textbox', { name: 'Institution/Affiliation', exact: true }).fill('  Example university  ');
  await page.getByLabel('What are you hoping to accomplish with Cal BioScape?').fill('Build a resource data integration.');
  await page.getByRole('button', { name: 'Explore the tool' }).click();
  await expect(page.getByRole('alert')).toContainText('earlier response was saved');
  expect(submissions).toHaveLength(1);
  await page.getByRole('button', { name: 'Explore the tool' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(submissions).toHaveLength(2);
  expect(submissions[1].submissionId).not.toBe(submissions[0].submissionId);
});

test('team view requires login, supports pagination and page export, and clears on session expiry', async ({ page }) => {
  let loggedIn = false;
  let expired = false;
  const responses = [{ id: 'test-1', createdAt: '2026-09-29T18:00:00.000Z', version: 1, role: 'researcher', otherRole: null, affiliation: 'Example university', goal: 'Find feedstock near candidate sites.', email: 'example@example.org', allowUpdates: true, allowFollowUp: false }];
  await page.route('**/api/admin/login', async route => {
    loggedIn = true;
    await route.fulfill({ json: { success: true } });
  });
  await page.route('**/api/admin/user-research**', async route => {
    if (!loggedIn || expired) return route.fulfill({ status: 401, json: { error: 'Unauthorized' } });
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/export')) return route.fulfill({ contentType: 'text/csv', body: 'role,goal\nresearcher,Find feedstock\n' });
    return route.fulfill({ json: url.searchParams.has('cursor')
      ? { responses: [{ ...responses[0], id: 'test-2', role: 'grower', affiliation: 'Example farm', goal: '', allowFollowUp: true }], nextCursor: null }
      : { responses, nextCursor: 'next-page' } });
  });
  await page.goto('/admin');
  await page.getByLabel('Username').fill('team');
  await page.getByLabel('Password').fill('example-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Example university', { exact: true })).toBeVisible();
  await expect(page.getByText('example@example.org', { exact: true })).toBeVisible();
  await expect(page.getByText('Follow-up: not opted in', { exact: true })).toBeVisible();
  await expect(page.getByText('Tool updates: opted in', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByText('Example farm', { exact: true })).toBeVisible();
  await expect(page.getByText('Follow-up: opted in', { exact: true })).toBeVisible();
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
