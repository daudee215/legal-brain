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
