/**
 * Live end-to-end check against the real Supabase project (needs network + a build with
 * NEXT_PUBLIC_SUPABASE_* set). Skipped unless LB_CLOUD_E2E=1:
 *
 *   LB_CLOUD_E2E=1 npx playwright test cloud
 *
 * Creates two throwaway accounts on an example.com address each run.
 */
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { PDFDocument, StandardFonts } from 'pdf-lib';

test.skip(process.env.LB_CLOUD_E2E !== '1', 'live cloud test — set LB_CLOUD_E2E=1');
test.describe.configure({ mode: 'serial', timeout: 90_000 });

const stamp = Date.now().toString(36);
const password = `Lb-${Math.random().toString(36).slice(2)}-${stamp}`;
const senior = { name: 'E2E Senior', email: `lb-e2e-${stamp}@example.com` };
const junior = { name: 'E2E Junior', email: `lb-e2e-${stamp}-j@example.com` };
const chamber = `E2E Chamber ${stamp}`;
if (process.env.LB_CLOUD_E2E === '1' && process.env.TEST_WORKER_INDEX !== undefined) console.log(`[cloud e2e] test accounts: ${senior.email}, ${junior.email}`);
const caseTitle = `E2E Ahmed v. The State ${stamp}`;
const FEE = /1,?50,?000/;
let caseUrl = '';
let invite = '';
const pdfName = `E2E Order ${stamp}.pdf`;
let pdfBytes: Buffer = Buffer.alloc(0);
let storagePath = '';

/** The public project URL + publishable key from .env.local (the same values baked into the build). */
function publicEnv() {
  const env = Object.fromEntries(
    readFileSync('.env.local', 'utf8')
      .split(/\r?\n/)
      .filter((l) => /^\s*NEXT_PUBLIC_SUPABASE_/.test(l))
      .map((l) => l.split('=').map((x) => x.trim()) as [string, string]),
  );
  return { url: env.NEXT_PUBLIC_SUPABASE_URL, key: env.NEXT_PUBLIC_SUPABASE_ANON_KEY };
}
/** A Supabase client signed in as a test member, to check what the server really holds. */
async function memberClient(email: string) {
  const { url, key } = publicEnv();
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return sb;
}
async function makePdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 200]);
  page.drawText(`Order sheet ${stamp}`, { x: 40, y: 120, size: 18, font: await doc.embedFont(StandardFonts.Helvetica) });
  return Buffer.from(await doc.save());
}

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

test('the senior uploads a PDF on a case and it reaches chamber storage', async ({ page }) => {
  pdfBytes = await makePdf();
  await login(page, senior.email);
  await page.goto(`${caseUrl}&tab=documents`);
  await synced(page);
  await page.getByLabel('Upload a file to this case').setInputFiles({ name: pdfName, mimeType: 'application/pdf', buffer: pdfBytes });
  await expect(page.getByText('File shared with your chamber')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(pdfName)).toBeVisible();
  await expect(page.locator('[data-upload]')).toHaveCount(0);
  await synced(page);
  const docs = await page.evaluate(() => JSON.parse(localStorage.getItem('lb.cloud.cache.v1') ?? '{}').docs as { name: string; storagePath?: string; size?: number }[]);
  const row = docs.find((d) => d.name === pdfName);
  expect(row?.size).toBe(pdfBytes.length);
  expect(row?.storagePath).toMatch(/^[0-9a-f-]{36}\/doc_[^/]+-E2E_Order_[a-z0-9]+\.pdf$/);
  storagePath = row!.storagePath!;
  // Settings shows the space it takes.
  await page.goto('/app/settings/');
  await expect(page.getByTestId('storage-used')).toContainText(/Storage used: \d+ KB of 1 GB/);
});

test('a junior on a fresh device opens the file and gets the same bytes', async ({ browser }) => {
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  await login(page, junior.email);
  await page.goto(`${caseUrl}&tab=documents`);
  await synced(page);
  await expect(page.getByText(pdfName)).toBeVisible({ timeout: 20_000 });
  // Nothing of it on this device yet: it comes from the chamber server.
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 30_000 }), page.getByRole('button', { name: `Download ${pdfName}` }).click()]);
  expect(download.suggestedFilename()).toBe(pdfName);
  const got = readFileSync((await download.path())!);
  expect(got.equals(pdfBytes)).toBe(true);
  // It is now cached on this device under its synced key (opening again needs no download).
  const cached = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const req = indexedDB.open('legal-brain');
        req.onsuccess = () => {
          const tx = req.result.transaction('files', 'readonly');
          const all = tx.objectStore('files').getAll();
          all.onsuccess = () => resolve((all.result as Blob[]).length);
          all.onerror = () => resolve(-1);
        };
        req.onerror = () => resolve(-1);
      }),
  );
  expect(cached).toBe(1);
  // Open (new tab) works too. Headless Chromium has no PDF viewer, so only check that a tab opens without an error.
  await Promise.all([ctx.waitForEvent('page'), page.getByRole('button', { name: `Open ${pdfName}` }).click()]);
  await expect(page.getByText(/not been uploaded|no longer on the chamber|Could not get/)).toHaveCount(0);
  await ctx.close();
});

test('deleting the document removes the file from chamber storage', async ({ page }) => {
  const sb = await memberClient(junior.email);
  const before = await sb.storage.from('chamber-files').download(storagePath);
  expect(before.error).toBeNull();
  expect(Buffer.from(await before.data!.arrayBuffer()).equals(pdfBytes)).toBe(true);

  const [folder, file] = storagePath.split('/');
  const listed = async () => ((await sb.storage.from('chamber-files').list(folder, { search: file })).data ?? []).length;
  expect(await listed()).toBe(1);

  await login(page, senior.email);
  await page.goto('/app/documents/');
  await synced(page);
  const removeCall = page.waitForResponse((r) => r.url().includes('/storage/v1/object/chamber-files') && r.request().method() === 'DELETE', { timeout: 15_000 });
  page.once('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: `Delete ${pdfName}` }).click();
  await expect(page.getByText('File deleted')).toBeVisible({ timeout: 15_000 });
  expect((await removeCall).status()).toBe(200);
  await synced(page);
  // The object list is the source of truth (a just-deleted file can still be served from the CDN cache for a while).
  await expect.poll(listed, { timeout: 20_000 }).toBe(0);
  await sb.auth.signOut();
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
