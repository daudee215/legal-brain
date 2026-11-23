/**
 * Live end-to-end check against the real Supabase project (needs network + a build with
 * NEXT_PUBLIC_SUPABASE_* set). Skipped unless LB_CLOUD_E2E=1:
 *
 *   LB_CLOUD_E2E=1 npx playwright test cloud
 *
 * Creates two throwaway accounts on an example.com address each run.
 */
import { expect, test, type Page } from '@playwright/test';

test.skip(process.env.LB_CLOUD_E2E !== '1', 'live cloud test — set LB_CLOUD_E2E=1');
test.describe.configure({ mode: 'serial', timeout: 90_000 });

const stamp = Date.now().toString(36);
const password = `Lb-${Math.random().toString(36).slice(2)}-${stamp}`;
const senior = { name: 'E2E Senior', email: `lb-e2e-${stamp}@example.com` };
const junior = { name: 'E2E Junior', email: `lb-e2e-${stamp}-j@example.com` };
const chamber = `E2E Chamber ${stamp}`;
const caseTitle = `E2E Ahmed v. The State ${stamp}`;
const FEE = /1,?50,?000/;
let caseUrl = '';
let invite = '';

const synced = (page: Page) => expect(page.locator('[data-sync="saved"]')).toBeVisible({ timeout: 20_000 });

test('sign up creates a chamber and opens it', async ({ page }) => {
  await page.goto('/signup/');
  await page.getByLabel('Your full name').fill(senior.name);
  await page.getByLabel('Email').fill(senior.email);
  await page.getByLabel('Password').fill(password);
  await page.getByLabel('Chamber name').fill(chamber);
  await page.getByRole('button', { name: 'Create account & chamber' }).click();
  await expect(page).toHaveURL(/\/app\/$/, { timeout: 20_000 });
  await synced(page);
  await expect(page.getByText(chamber).first()).toBeVisible();
  // Real role: no "Preview as" switch.
  await expect(page.getByLabel('Preview as', { exact: true })).toHaveCount(0);
});

test('a case and a fee added by the senior reach the server', async ({ page }) => {
  await login(page, senior.email);
  await page.goto('/app/cases/');
  await synced(page);
  await page.getByRole('button', { name: 'Add case' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add case' });
  await dialog.getByLabel('Case title').fill(caseTitle);
  await dialog.getByRole('button', { name: /save/i }).click();
  await expect(page).toHaveURL(/\/app\/case\/\?id=/, { timeout: 10_000 });
  caseUrl = new URL(page.url()).pathname + new URL(page.url()).search;

  await page.getByRole('tab', { name: 'Fees' }).click();
  await page.getByRole('button', { name: 'Record payment' }).click();
  await page.getByLabel('Agreed fee (Rs)').fill('150000');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await synced(page);

  // Drop this device's copy and reload: what shows now came from the server.
  await page.evaluate(() => {
    localStorage.removeItem('lb.cloud.cache.v1');
    localStorage.removeItem('lb.cloud.meta.v1');
  });
  await page.goto('/app/cases/');
  await expect(page.getByText(caseTitle).first()).toBeVisible({ timeout: 20_000 });
  await page.goto(`${caseUrl}&tab=fees`);
  await expect(page.getByText(FEE).first()).toBeVisible({ timeout: 20_000 });
});

test('the same user on another device sees the case', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await login(page, senior.email);
  await page.goto('/app/cases/');
  await expect(page.getByText(caseTitle).first()).toBeVisible({ timeout: 20_000 });
  await ctx.close();
});

test('realtime: a case added on one device appears on another without reloading', async ({ browser }) => {
  const a = await browser.newContext();
  const b = await browser.newContext();
  const pa = await a.newPage();
  const pb = await b.newPage();
  await login(pa, senior.email);
  await login(pb, senior.email);
  await pb.goto('/app/cases/');
  await synced(pb);
  await pb.waitForTimeout(2000); // let the realtime channel subscribe
  const live = `${caseTitle} (live)`;
  await pa.goto('/app/cases/');
  await synced(pa);
  await pa.getByRole('button', { name: 'Add case' }).click();
  await pa.getByRole('dialog', { name: 'Add case' }).getByLabel('Case title').fill(live);
  await pa.getByRole('button', { name: 'Save case' }).click();
  await expect(pb.getByText(live).first()).toBeVisible({ timeout: 20_000 });
  await a.close();
  await b.close();
});

test('the senior creates an invite link for a junior', async ({ page }) => {
  await login(page, senior.email);
  await page.goto('/app/chamber/');
  await synced(page);
  await page.getByRole('button', { name: 'Create invite link' }).click();
  const link = page.getByRole('textbox', { name: 'Invite link' });
  await expect(link).toHaveValue(/\/join\/\?code=[0-9a-f]+$/, { timeout: 10_000 });
  invite = new URL(await link.inputValue()).search;
});

test('a junior joins with the link, sees cases but no fees', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`/join/${invite}`);
  await expect(page.getByRole('heading', { name: `Join ${chamber}` })).toBeVisible({ timeout: 20_000 });
  await page.getByLabel('Your full name').fill(junior.name);
  await page.getByLabel('Email').fill(junior.email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: `Join ${chamber}` }).click();
  await expect(page).toHaveURL(/\/app\/$/, { timeout: 20_000 });
  await synced(page);

  await page.goto('/app/cases/');
  await expect(page.getByText(caseTitle).first()).toBeVisible({ timeout: 20_000 });
  await page.goto(caseUrl);
  await expect(page.getByRole('heading', { level: 1, name: caseTitle })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('tab', { name: 'Fees' })).toHaveCount(0);
  await page.goto(`${caseUrl}&tab=fees`);
  await expect(page.getByText(FEE)).toHaveCount(0);
  // Not just hidden: the server never sent the fee data to this device.
  const fees = await page.evaluate(() => JSON.parse(localStorage.getItem('lb.cloud.cache.v1') ?? '{}').fees);
  expect(fees).toEqual([]);
  await page.goto('/app/');
  await expect(page.getByText('Fees outstanding')).toHaveCount(0);
  await ctx.close();
});

test('the senior sees the junior as a member', async ({ page }) => {
  await login(page, senior.email);
  await page.goto('/app/chamber/');
  await expect(page.getByRole('cell', { name: junior.email })).toBeVisible({ timeout: 20_000 });
});

async function login(page: Page, email: string) {
  await page.goto('/login/');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/app\/$/, { timeout: 20_000 });
}
