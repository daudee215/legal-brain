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
