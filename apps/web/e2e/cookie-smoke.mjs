// ============================================================
// Smoke test browser untuk alur sesi berbasis cookie httpOnly.
//
// Memverifikasi (di browser sungguhan, bukan curl):
//   1. Halaman login tampil saat anonim.
//   2. Login berhasil → dashboard tampil.
//   3. Refresh token diset sebagai cookie HttpOnly + SameSite=Lax,
//      dan TIDAK disimpan di localStorage.
//   4. Sesi BERTAHAN setelah reload (access token in-memory hilang →
//      app refresh via cookie httpOnly) — ini perilaku kunci yang tak
//      bisa diuji dengan supertest/curl.
//   5. Logout → kembali ke login + cookie terhapus.
//
// Prasyarat:
//   - Server dev jalan: `API_PORT=4001 npm --workspace apps/api run dev`
//     dan `npm --workspace apps/web run dev` (Vite proxy /api → :4001).
//   - DB dev sudah tersinkron: `npm run prisma:migrate` / `prisma db push`
//     + akun demo (seed): akademik@tazkia.ac.id / password123.
//   - Playwright + Chrome sistem: `npm i -D playwright` (pakai channel 'chrome').
//
// Jalankan: `node apps/web/e2e/cookie-smoke.mjs`
// Override: SMOKE_BASE, SMOKE_USER, SMOKE_PASS (env).
// ============================================================
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_BASE || 'http://localhost:5173';
const USER = process.env.SMOKE_USER || 'akademik@tazkia.ac.id';
const PASS = process.env.SMOKE_PASS || 'password123';
const LOGIN_HEADING = 'text=Masuk ke akun Anda';

const results = [];
const check = (name, ok) => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); };
const isLoggedIn = async (page) => (await page.locator(LOGIN_HEADING).count()) === 0;

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext();
const page = await context.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('  [browser console.error]', m.text()); });

try {
  // 1) Halaman login tampil
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('input[placeholder*="2021110001"]', { timeout: 20000 });
  check('halaman login tampil (anon, tak ada sesi)', (await page.locator(LOGIN_HEADING).count()) > 0);

  // 2) Login
  await page.fill('input[placeholder*="2021110001"]', USER);
  await page.fill('input[type="password"]', PASS);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.waitForSelector('button.topbar__logout', { timeout: 20000 }).catch(() => {});
  await page.waitForLoadState('networkidle');
  check('login berhasil (form login hilang, dashboard tampil)', await isLoggedIn(page));

  // 3) Cookie httpOnly refresh — dibaca dari context (JS di halaman TIDAK bisa)
  let cookies = await context.cookies();
  const rt = cookies.find((c) => c.name === 'siakad_rt');
  check('cookie refresh `siakad_rt` diset', !!rt);
  check('cookie bersifat HttpOnly', rt && rt.httpOnly === true);
  check('cookie SameSite=Lax', rt && /lax/i.test(String(rt.sameSite)));
  const lsRefresh = await page.evaluate(() => localStorage.getItem('siakad.refresh'));
  check('refresh token TIDAK ada di localStorage', lsRefresh === null);

  // 4) RELOAD → sesi harus bertahan (access token in-memory hilang → refresh via cookie)
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  check('sesi BERTAHAN setelah reload (restore via cookie httpOnly)', await isLoggedIn(page));

  // 5) Logout → kembali ke login + cookie terhapus
  const logoutBtn = page.locator('button.topbar__logout');
  if (await logoutBtn.count()) { await logoutBtn.first().click(); }
  await page.waitForSelector(LOGIN_HEADING, { timeout: 15000 }).catch(() => {});
  check('logout → kembali ke halaman login', (await page.locator(LOGIN_HEADING).count()) > 0);
  cookies = await context.cookies();
  check('cookie `siakad_rt` terhapus setelah logout', !cookies.find((c) => c.name === 'siakad_rt'));
} catch (e) {
  console.log('ERROR:', e.message);
  results.push({ name: 'script berjalan tanpa error', ok: false });
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n===== ${results.length - failed.length}/${results.length} PASS =====`);
process.exit(failed.length ? 1 : 0);
