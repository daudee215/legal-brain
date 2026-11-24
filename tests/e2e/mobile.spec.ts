import { expect, test } from '@playwright/test';
import { ROUTES } from './routes';

test.use({ viewport: { width: 375, height: 812 } });

for (const path of ROUTES) {
  test(`no horizontal scroll at 375px: ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1').first()).toBeVisible();
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(sw).toBeLessThanOrEqual(375);
  });
}

test('menu button opens the drawer', async ({ page }) => {
  await page.goto('/app/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.getByRole('dialog', { name: 'Menu' }).getByText('Dashboard')).toBeVisible();
});

test('the phone tab bar jumps between the court-day screens and opens the full menu', async ({ page }) => {
  await page.goto('/app/');
  const bar = page.getByRole('navigation', { name: 'Quick' });
  await expect(bar).toBeVisible();
  await bar.getByRole('link', { name: 'Cases' }).click();
  await expect(page).toHaveURL(/\/app\/cases\/?$/);
  await expect(bar.getByRole('link', { name: 'Cases' })).toHaveAttribute('aria-current', 'page');
  await bar.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
});

test('the phone tab bar is hidden on a desktop-sized screen', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/app/');
  await expect(page.getByRole('navigation', { name: 'Quick' })).toBeHidden();
});

for (const path of ['/app/studio/', '/app/chamber/', '/app/documents/', '/app/library/']) {
  test(`Urdu: ${path} renders RTL with Urdu text and no sideways scroll`, async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('lb.lang', 'ur'));
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('h1').first()).toBeVisible();
    expect(await page.locator('main').innerText()).toMatch(/[؀-ۿ]/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  });
}
