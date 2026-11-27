import { expect, test } from '@playwright/test';

test('Case Law lists judgments from every court and a search narrows them', async ({ page }) => {
  await page.goto('/app/case-law/');
  await expect(page.getByRole('tab', { name: /All courts \([\d,]+\)/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'Supreme Court (1,365)' })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Sindh High Court \([\d,]+\)/ })).toBeVisible();
  await expect(page.getByText(/^[\d,]+ judgments$/)).toBeVisible();
  await page.getByLabel('Search judgments').fill('Muhammad Shoaib 1290');
  await expect(page.getByText('1 judgment', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Muhammad Shoaib v. The State & another' }).click();
  await expect(page).toHaveURL(/\/app\/case-law\/read\/\?id=sc-crl-p-l-a-1290-2021/);
  await expect(page.getByRole('heading', { name: 'Muhammad Shoaib v. The State & another' })).toBeVisible();
  await expect(page.getByText('Decided 6 Dec 2021')).toBeVisible();
  await expect(page.getByText('Justice Munib Akhtar', { exact: true })).toBeVisible();
});

test('find-in-judgment highlights matches; subject filter and Show more work', async ({ page }) => {
  await page.goto('/app/case-law/read/?id=sc-crl-p-l-a-1290-2021');
  await page.getByPlaceholder(/Find in this judgment/).fill('bail');
  await expect(page.getByText(/\d+ match(es)? highlighted/)).toBeVisible();
  expect(await page.locator('mark').count()).toBeGreaterThan(0);

  await page.goto('/app/case-law/?subject=Bail');
  await expect(page.getByLabel('Subject')).toHaveValue('Bail');
  const cards = page.locator('a[href^="/app/case-law/read/"]');
  await expect(cards).toHaveCount(25);
  await page.getByRole('button', { name: /Show more/ }).click();
  await expect(cards).toHaveCount(50);
});

test('a statute page links to the Supreme Court judgments that cite it', async ({ page }) => {
  await page.goto('/app/laws/crpc-1898/');
  await expect(page.getByRole('heading', { name: 'Judgments citing this law', exact: true })).toBeVisible();
  await page.getByRole('link', { name: /See all/ }).click();
  await expect(page).toHaveURL(/law=crpc-1898/);
  await expect(page.getByText('Code of Criminal Procedure').first()).toBeVisible();
});

test('a Sindh High Court judgment shows its citation, bench seat, result and the court’s own text', async ({ page }) => {
  await page.goto('/app/case-law/?source=shc');
  await expect(page.getByRole('tab', { name: /Sindh High Court/ })).toHaveAttribute('aria-selected', 'true');
  const first = page.locator('a[href^="/app/case-law/read/?id=shc-"]').first();
  const title = (await first.innerText()).trim();
  await first.click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByText('Sindh High Court', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/bench$/).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Original on the Sindh High Court website/ })).toHaveAttribute('href', /caselaw\.shc\.gov\.pk\/caselaw\/view-file\//);
  expect(await page.locator('.font-reading p, details div div').count()).toBeGreaterThan(0);
});

test('the demo examples are still one tab away', async ({ page }) => {
  await page.goto('/app/case-law/');
  await page.getByRole('tab', { name: /Demo examples/ }).click();
  await expect(page.getByText('Crl. Petition 101/2026')).toBeVisible();
});
