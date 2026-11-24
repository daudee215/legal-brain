import { expect, test } from '@playwright/test';
import { ROUTES } from './routes';


for (const path of ROUTES) {
  test(`renders ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('clerk is blocked from the AI assistant', async ({ page }) => {
  await page.goto('/app/');
  await page.getByLabel('Preview as', { exact: true }).selectOption('clerk');
  await page.goto('/app/assistant/');
  await expect(page.getByText(/doesn.t have access/)).toBeVisible();
});

for (const path of ['/app/chamber/', '/app/settings/', '/app/studio/', '/app/precedents/']) {
  test(`clerk is blocked from ${path}`, async ({ page }) => {
    await page.goto('/app/');
    await page.getByLabel('Preview as', { exact: true }).selectOption('clerk');
    await page.goto(path);
    await expect(page.getByText(/doesn.t have access/)).toBeVisible();
  });
}

test('the senior can pick a colour scheme and it applies across the app', async ({ page }) => {
  await page.goto('/app/studio/');
  await page.getByRole('button', { name: /Emerald/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'emerald');
  await page.goto('/app/');
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'emerald');
});

test('assistant answers a suggested question with citations', async ({ page }) => {
  await page.goto('/app/assistant/');
  await page.getByRole('button', { name: /grounds for post-arrest bail/ }).click();
  await expect(page.getByRole('link', { name: 'S. 497 CrPC' })).toBeVisible();
});

test('the senior can give one clerk their own rights, and the change can be undone', async ({ page }) => {
  await page.goto('/app/studio/');
  await page.getByRole('tab', { name: 'Access rights' }).click();
  const row = page.getByRole('listitem').filter({ hasText: 'Clerk' }).first();
  await row.getByRole('button', { name: 'Set rights' }).click();
  await row.getByRole('checkbox', { name: /Add and edit cases/ }).check();
  await expect(row.getByText('Own rights')).toBeVisible();
  await row.getByRole('button', { name: /Back to the Clerk rights/ }).click();
  await expect(row.getByText('Follows role')).toBeVisible();
});

test('the reminders tab can switch morning emails on', async ({ page }) => {
  await page.goto('/app/studio/');
  await page.getByRole('tab', { name: 'Reminders' }).click();
  const box = page.getByRole('checkbox', { name: 'Send morning hearing emails' });
  await box.check();
  await expect(box).toBeChecked();
});

test('the Safety tab explains it needs a shared chamber when running as a demo', async ({ page }) => {
  await page.goto('/app/studio/');
  await page.getByRole('tab', { name: 'Safety' }).click();
  await expect(page.getByText(/available once you are signed in to your shared chamber/)).toBeVisible();
});

test('a case offers a hearing prep sheet, calendar entry, camera scan and promised payments', async ({ page }) => {
  await page.goto('/app/cases/');
  await page.getByRole('link', { name: /Zahid Traders/ }).first().click();
  await expect(page.getByRole('button', { name: /Hearing prep sheet/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Add to calendar/ })).toBeVisible();
  await page.getByRole('tab', { name: /Documents/ }).click();
  await expect(page.getByRole('button', { name: /Scan with camera/ })).toBeVisible();
  await page.getByRole('tab', { name: /Fees/ }).click();
  await expect(page.getByText('Promised payments').first()).toBeVisible();
});

test('Today can export hearings to the calendar and Documents can scan with the camera', async ({ page }) => {
  await page.goto('/app/today/');
  await expect(page.getByRole('button', { name: /Export hearings to calendar/ })).toBeVisible();
  await page.goto('/app/documents/');
  await page.getByRole('button', { name: /Scan with camera/ }).click();
  await expect(page.getByRole('button', { name: /Take photo/ }).or(page.getByText(/Take photo/)).first()).toBeVisible();
});

test('Tools has the monthly practice report', async ({ page }) => {
  await page.goto('/app/tools/');
  await expect(page.getByText('Monthly practice report').first()).toBeVisible();
});
