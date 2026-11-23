import { expect, test } from '@playwright/test';

test('recording an outcome on Today saves on this device and survives a reload', async ({ page }) => {
  await page.goto('/app/today/');
  await page.getByRole('button', { name: 'Record outcome' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Record outcome' });
  await dialog.getByRole('button', { name: '+14 days' }).click();
  await dialog.getByLabel('Proceedings').fill('Adjourned on request of the respondent.');
  await dialog.getByRole('button', { name: 'Save outcome' }).click();
  await expect(dialog.getByText('Saved')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Outcome recorded').first()).toBeVisible();
  // The demo banner disappears once the practice has its own saved copy.
  await expect(page.getByText(/exploring demo data/)).toHaveCount(0);
});

test('pasted cause-list text finds the case with its serial number', async ({ page }) => {
  await page.goto('/app/cause-list/');
  await page.getByRole('button', { name: 'Or paste the cause-list text' }).click();
  await page.getByLabel('Cause-list text').fill('COURT NO. 21\nBefore: Single Bench-IX\n15. WP No.30112 of 2026 Zahid Traders v. Federation of Pakistan');
  await page.getByRole('button', { name: 'Find my cases' }).click();
  await expect(page.getByText('Zahid Traders v. Federation of Pakistan').first()).toBeVisible();
  await expect(page.getByText(/Sr\.?\s*15/).first()).toBeVisible();
});

test('Urdu switches the app to right-to-left and back', async ({ page }) => {
  await page.goto('/app/');
  await page.getByRole('button', { name: 'Switch to Urdu' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ur');
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveAttribute('dir', 'rtl');
});
