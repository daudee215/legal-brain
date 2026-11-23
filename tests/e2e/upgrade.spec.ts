import { expect, test } from '@playwright/test';

test('Ctrl+K opens the command palette and navigates to a case', async ({ page }) => {
  await page.goto('/app/');
  await expect(page.locator('h1').first()).toBeVisible();
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: 'Command palette' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('combobox').fill('Zahid Traders v. Federation');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/app\/cases\/k3\/$/);
  await expect(page.getByRole('heading', { level: 1, name: /Zahid Traders v\. Federation/ })).toBeVisible();
});

test('dark mode toggles on the app and never leaks to the landing page', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/app/');
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/\bdark\b/); // remembered
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
});

test('cases can be shown as a board grouped by status', async ({ page }) => {
  await page.goto('/app/cases/');
  await page.getByRole('button', { name: 'Board' }).click();
  await expect(page.getByRole('region', { name: 'Judgment reserved column' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Pending column' }).getByText('Muhammad Usman v. The State', { exact: true })).toBeVisible();
});

test('fees are visible to a senior but not to a junior', async ({ page }) => {
  await page.goto('/app/cases/k1/?tab=fees');
  await expect(page.getByRole('tab', { name: 'Fees' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Outstanding', { exact: true })).toBeVisible();
  await page.getByLabel('Preview as', { exact: true }).selectOption('junior');
  await expect(page.getByRole('tab', { name: 'Fees' })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
});
