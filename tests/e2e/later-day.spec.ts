import { expect, test } from '@playwright/test';
import { ROUTES } from './routes';

// The site is built once and viewed on later days. Pages must not hydrate with build-day dates.
const LATER = new Date(Date.now() + 3 * 86_400_000);

for (const path of ROUTES) {
  test(`no hydration errors 3 days after build: ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.clock.setFixedTime(LATER);
    await page.goto(path);
    await expect(page.locator('h1').first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('judgment date on detail page matches the list 3 days after build', async ({ page }) => {
  await page.clock.setFixedTime(LATER);
  await page.goto('/app/case-law/');
  const listText = await page.locator('text=Crl. Petition 101/2026').locator('..').innerText();
  const listDate = listText.match(/\d{1,2} [A-Z][a-z]{2} \d{4}/)![0];
  await page.goto('/app/case-law/j1/');
  await expect(page.getByText(`Decided ${listDate}`)).toBeVisible();
});

test('restricted page content is not in the static HTML (no flash for a clerk)', async ({ request }) => {
  const html = await (await request.get('/app/assistant/')).text();
  expect(html).not.toContain('How can I help with your cases today');
});
