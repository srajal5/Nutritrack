/**
 * Direct component regression tests against seeded canonical data.
 *
 * Asserts what is actually RENDERED for a user whose plan is exactly
 * 2400 kcal / 150g protein / 260g carbs / 75g fat / 3000ml water with today's
 * intake 1780 / 115 / 190 / 52 / 1900ml.
 *
 * Covers: Dashboard nutrition cards, NutrientBreakdownChart, WeeklyCaloriesChart,
 * NutritionInsights (in Tracker), and the incomplete-profile state.
 *
 * Usage:  node tests/component-regression.mjs
 */
import { chromium } from 'playwright';
import { seed, CANONICAL } from './seed-fixtures.mjs';

const BASE = process.env.BASE_URL || 'http://localhost:3002';
const SHOTS = process.env.SHOT_DIR;

// When exercising a PRODUCTION build over plain HTTP, session cookies are
// marked Secure and express-session (behind `trust proxy`) only emits them when
// the request looks like it arrived over HTTPS. A real deployment always sends
// this header; set FORWARD_PROTO=1 to simulate it locally.
const EXTRA_HEADERS = process.env.FORWARD_PROTO
  ? { 'X-Forwarded-Proto': 'https' }
  : undefined;

let passed = 0, failed = 0;
function check(name, ok, detail = '') {
  if (ok) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}${detail ? ` -- ${detail}` : ''}`); }
}

const T = CANONICAL.targets;
const D = CANONICAL.today;

async function shot(page, name) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }).catch(() => {});
}

async function dismissCookies(page) {
  const b = page.getByRole('button', { name: /accept all/i }).first();
  if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); await page.waitForTimeout(300); }
}

async function login(page, username, password) {
  await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle' });
  await dismissCookies(page);
  await page.getByRole('button', { name: /^login$/i }).first().click();
  await page.waitForTimeout(300);
  await page.locator('input[autocomplete="username"]').fill(username);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole('button', { name: /sign in/i }).first().click();
  await page.waitForTimeout(3500);
}

console.log('\nSeeding fixtures…');
const fx = await seed();
console.log(`  canonical user : ${fx.canonicalName}`);
console.log(`  incomplete user: ${fx.incompleteName}`);

const browser = await chromium.launch();
const consoleErrors = [];

try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 }, extraHTTPHeaders: EXTRA_HEADERS });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  await login(page, fx.canonicalName, fx.password);
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });
  await page.waitForSelector('text=/Welcome back/i', { timeout: 30000 });
  await page.waitForTimeout(2000);
  await shot(page, 'c01-dashboard-canonical');

  const main = await page.locator('main').first().innerText();

  console.log('\n=== Dashboard nutrition cards render the persisted plan ===');
  // The UI formats thousands with separators, so compare with those stripped.
  const mainDigits = main.replace(/,/g, '');
  check(`calories show ${D.calories} / ${T.calories}`,
    new RegExp(`${D.calories}\\s*/\\s*${T.calories}\\s*kcal`).test(mainDigits),
    main.match(/Calories[\s\S]{0,60}/)?.[0]?.replace(/\n/g, ' '));
  check(`protein shows ${D.protein}g / ${T.proteinGrams}g`,
    new RegExp(`${D.protein}g[\\s\\S]{0,20}${T.proteinGrams}g`).test(main),
    main.match(/Protein[\s\S]{0,60}/)?.[0]?.replace(/\n/g, ' '));
  check('water shows 1.9L / 3.0L',
    /1\.9L/.test(main) && /3\.0L/.test(main),
    main.match(/Water[\s\S]{0,60}/)?.[0]?.replace(/\n/g, ' '));
  check('remaining calories are correct (620)',
    main.includes('620'), main.match(/[\d,]+ kcal remaining/)?.[0]);
  check('remaining protein is correct (35g)',
    /35g remaining/.test(main), main.match(/\d+g remaining/)?.[0]);
  check('no NaN rendered anywhere', !/NaN/.test(main));
  check('no Infinity rendered anywhere', !/Infinity/.test(main));
  check('no "/ 0 kcal" placeholder', !/\/\s*0\s*kcal/.test(main));

  console.log('\n=== NutrientBreakdownChart (macro split) is mounted and populated ===');
  const macro = page.getByTestId('macro-breakdown');
  check('macro breakdown is present', await macro.count() > 0);
  const macroText = await macro.innerText().catch(() => '');
  check('macro chart renders a canvas', await macro.locator('canvas').count() > 0);
  check('macro percentages are not NaN', !/NaN/.test(macroText), macroText.replace(/\n/g, ' ').slice(0, 120));
  // protein 115*4=460, carbs 190*4=760, fat 52*9=468 -> total 1688
  // protein 27%, carbs 45%, fat 28%
  check('protein share ≈27%', /27%/.test(macroText), macroText.replace(/\n/g, ' ').slice(0, 160));
  check('carbs share ≈45%', /45%/.test(macroText), macroText.replace(/\n/g, ' ').slice(0, 160));
  const carbsFat = await page.locator('text=/Carbs \\d+g \\/ \\d+g/').first().innerText().catch(() => '');
  check(`carbs/fat vs target shown (${D.carbs}g / ${T.carbsGrams}g)`,
    carbsFat.includes(`${D.carbs}g / ${T.carbsGrams}g`), carbsFat);

  console.log('\n=== WeeklyCaloriesChart is mounted and uses canonical data ===');
  const weekly = page.getByTestId('weekly-calories');
  check('weekly chart is present', await weekly.count() > 0);
  check('weekly chart renders a canvas', await weekly.locator('canvas').count() > 0);
  check('weekly chart is not stuck in its loading skeleton',
    !(await weekly.locator('.animate-pulse').count()));
  check('weekly chart shows no "complete your plan" state for a user WITH a plan',
    !/Complete your personalized plan/i.test(await weekly.innerText().catch(() => '')));

  // Chart.js v4 keeps no global instance registry, so verify the exact data the
  // chart consumes (the endpoint it reads) and that the canvas actually painted.
  const weeklyApi = await page.evaluate(async () =>
    (await fetch('/api/food-entries/weekly', { credentials: 'include' })).json());

  check('weekly endpoint returns 7 buckets', Array.isArray(weeklyApi) && weeklyApi.length === 7,
    JSON.stringify(weeklyApi)?.slice(0, 120));
  check('every bucket has a valid date (no Invalid Date labels)',
    weeklyApi.every((d) => !Number.isNaN(new Date(d.date).getTime())));
  check('buckets are in ascending date order',
    weeklyApi.every((d, i) => i === 0 || new Date(d.date) > new Date(weeklyApi[i - 1].date)));
  check(`today's bucket equals today's intake (${D.calories})`,
    weeklyApi[6].calories === D.calories, `got ${weeklyApi[6].calories}`);
  check('earlier seeded days carry their own totals',
    weeklyApi.slice(2, 6).every((d) => d.calories > 0), JSON.stringify(weeklyApi.map((d) => d.calories)));
  check('days with no meals are 0, not omitted',
    weeklyApi.slice(0, 2).every((d) => d.calories === 0), JSON.stringify(weeklyApi.map((d) => d.calories)));
  check('no bucket carries another user\'s data (totals match what was seeded)',
    weeklyApi.reduce((a, d) => a + d.calories, 0) === D.calories + 1950 + 2000 + 2050 + 2100,
    String(weeklyApi.reduce((a, d) => a + d.calories, 0)));

  // Canvas must have actually drawn: sample it for non-transparent pixels.
  const painted = await weekly.locator('canvas').first().evaluate((cv) => {
    const c = cv;
    const ctx = c.getContext('2d');
    if (!ctx || !c.width || !c.height) return 0;
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    let n = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) n++;
    return n;
  }).catch(() => -1);
  check('weekly chart canvas actually rendered pixels', painted > 500, `opaque pixels=${painted}`);

  console.log('\n=== NutritionInsights (Tracker) uses canonical targets ===');
  await page.goto(`${BASE}/tracker`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await shot(page, 'c02-tracker-insights');
  const tracker = await page.locator('body').innerText();

  check('Today\'s Summary section rendered', /Today's Summary/i.test(tracker));
  check('calorie percentage is 74%', /74%/.test(tracker), tracker.match(/\d+%[\s\S]{0,12}Calories/)?.[0]?.replace(/\n/g, ' '));
  check('protein percentage is 77%', /77%/.test(tracker), tracker.match(/\d+%[\s\S]{0,12}Protein/)?.[0]?.replace(/\n/g, ' '));
  check('no NaN% in insights', !/NaN/.test(tracker));
  check('no Infinity% in insights', !/Infinity/.test(tracker));
  check(`tracker shows ${D.calories} / ${T.calories}`,
    new RegExp(`${D.calories}\\s*/\\s*${T.calories}`).test(tracker.replace(/,/g, '')),
    tracker.match(/\d[\d,]*\s*\/\s*\d[\d,]*/)?.[0]);
  check('tracker shows the correct remaining calories (620)', /620 remaining/.test(tracker));
  check('tracker shows 74% of goal', /74% of goal/.test(tracker));
  // Tracker's macro tiles render consumed + percentage rather than the raw
  // target; 77% is only reachable from the persisted 150g target (115/150).
  check('protein tile percentage derives from the persisted 150g target', /77%/.test(tracker));
  check('carbs tile percentage derives from the persisted 260g target', /73%/.test(tracker));
  check('fat tile percentage derives from the persisted 75g target', /69%/.test(tracker));
  check('tracker does not fall back to 2000/150/250', !/\/\s*2000\b/.test(tracker));

  console.log('\n=== Exactly one navigation bar renders ===');
  {
    // Signed in, on the landing page: only the authenticated Navbar.
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await shot(page, 'c04-home-signed-in');
    const navCount = await page.locator('nav[aria-label="Main navigation"], header').count();
    const homeText = await page.locator('body').innerText();
    check('signed-in landing page shows the authenticated nav',
      /Dashboard/.test(homeText) && /Log Food/.test(homeText));
    check('signed-in landing page does NOT also show the public nav (no Sign In)',
      !/Sign In/.test(homeText), homeText.slice(0, 160).replace(/\n/g, ' '));
    check('only one navigation bar is mounted', navCount === 1, `found ${navCount}`);
  }

  {
    // Signed out: only the public Header.
    const anon = await browser.newContext({ viewport: { width: 1440, height: 900 }, extraHTTPHeaders: EXTRA_HEADERS });
    const anonPage = await anon.newPage();
    await anonPage.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await anonPage.waitForTimeout(1500);
    await shot(anonPage, 'c05-home-signed-out');
    const anonText = await anonPage.locator('body').innerText();
    const anonNavCount = await anonPage.locator('nav[aria-label="Main navigation"], header').count();
    check('signed-out landing page shows the public nav', /Sign In/.test(anonText));
    check('signed-out landing page does NOT show the authenticated nav',
      !/Log Food/.test(anonText), anonText.slice(0, 160).replace(/\n/g, ' '));
    check('only one navigation bar when signed out', anonNavCount === 1, `found ${anonNavCount}`);
    await anon.close();
  }

  console.log('\n=== Incomplete profile gets NO fabricated plan ===');
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 1000 }, extraHTTPHeaders: EXTRA_HEADERS });
  const page2 = await ctx2.newPage();
  page2.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`[incomplete] ${m.text()}`); });
  await login(page2, fx.incompleteName, fx.password);
  await page2.waitForTimeout(3000);
  await shot(page2, 'c03-incomplete-profile');
  const bad = await page2.locator('body').innerText();

  check('incomplete profile is asked to complete the plan',
    /Complete your personalized plan|Build your plan/i.test(bad), bad.slice(0, 200).replace(/\n/g, ' '));
  check('no fabricated 1500 kcal target', !/1500\s*kcal/.test(bad));
  check('no fabricated 2000 kcal target', !/2000\s*kcal/.test(bad));
  check('no fabricated 120g protein', !/120g\s*\/|\/\s*120g/.test(bad));
  check('no NaN shown to an incomplete user', !/NaN/.test(bad));

  // Cross-check the API directly for the same user.
  const apiCheck = await page2.evaluate(async () => {
    const r = await fetch('/api/user', { credentials: 'include' });
    const u = await r.json();
    const d = await fetch(`/api/dashboard/${u.id}`, { credentials: 'include' });
    return d.json();
  });
  check('API reports the profile as incomplete',
    apiCheck.planStatus === 'incomplete_profile', String(apiCheck.planStatus));
  check('API returns no plan object', apiCheck.plan === null);
  check('API names the missing fields',
    Array.isArray(apiCheck.missingFields) && apiCheck.missingFields.length > 0,
    JSON.stringify(apiCheck.missingFields));
  check('missing fields include heightCm (stored in feet) and biologicalSex',
    apiCheck.missingFields?.includes('heightCm') && apiCheck.missingFields?.includes('biologicalSex'),
    JSON.stringify(apiCheck.missingFields));

  await ctx2.close();
  await ctx.close();

  console.log('\n=== Console health ===');
  const real = consoleErrors.filter((e) =>
    !/favicon|React DevTools|WebSocket|HMR|vite|status of 401/i.test(e));
  check('no unexpected console errors', real.length === 0, real.slice(0, 2).join(' | '));

} catch (err) {
  failed++;
  console.log(`\n  FATAL: ${err.message}`);
} finally {
  await browser.close();
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
