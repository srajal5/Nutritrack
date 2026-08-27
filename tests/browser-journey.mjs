/**
 * Real browser test of the full user journey with Playwright.
 * Register -> onboarding -> plan -> dashboard -> log food -> water -> weight
 * -> profile -> stats -> tracker -> AI coach -> logout -> login -> persistence.
 */
import { chromium } from 'playwright';

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
const consoleErrors = [];
const networkErrors = [];

function check(name, ok, detail = '') {
  if (ok) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}${detail ? ` -- ${detail}` : ''}`); }
}

const stamp = Date.now();
const USER_A = { username: `ui_a_${stamp}`, email: `ui_a_${stamp}@x.com`, password: 'secret123' };
const USER_B = { username: `ui_b_${stamp}`, email: `ui_b_${stamp}@x.com`, password: 'secret123' };

async function dismissCookieBanner(page) {
  const accept = page.getByRole('button', { name: /accept all/i }).first();
  if (await accept.isVisible().catch(() => false)) {
    await accept.click().catch(() => {});
    await page.waitForTimeout(400);
  }
}

/**
 * Waits until `read()` satisfies `ok()`, or fails after `timeout`.
 * Used instead of fixed sleeps so assertions stay strict on a slow network.
 */
async function waitFor(read, ok, { timeout = 25000, interval = 500 } = {}) {
  const started = Date.now();
  let last;
  while (Date.now() - started < timeout) {
    last = await read();
    if (ok(last)) return last;
    await new Promise((r) => setTimeout(r, interval));
  }
  return last;
}

async function shot(page, name) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }).catch(() => {});
}

/** Click a button/element whose visible text matches. */
async function clickText(page, text, opts = {}) {
  const el = page.getByRole('button', { name: text, exact: false }).first();
  await el.waitFor({ state: 'visible', timeout: opts.timeout ?? 10000 });
  await el.click();
}

async function register(page, creds) {
  await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle' });
  await dismissCookieBanner(page);
  await page.getByRole('button', { name: /register/i }).first().click();
  await page.waitForTimeout(400);
  await page.locator('input[autocomplete="username"]').fill(creds.username);
  await page.locator('input[type="email"]').fill(creds.email);
  const pw = page.locator('input[autocomplete="new-password"]');
  await pw.nth(0).fill(creds.password);
  await pw.nth(1).fill(creds.password);
  await clickText(page, /create account/i);
}

/** Fill the 5-step onboarding wizard. */
async function completeOnboarding(page, o) {
  await page.waitForURL(/\/onboarding/, { timeout: 20000 });
  await dismissCookieBanner(page);

  // Step 1 — goal (optionally via natural language)
  if (o.goalText) {
    await page.locator('#goal-text').fill(o.goalText);
    await clickText(page, /interpret my goal/i);
    await page.waitForTimeout(1500);
  }
  await page.locator(`button:has-text("${o.goalLabel}")`).first().click();
  await clickText(page, /continue/i);

  // Step 2 — measurements
  await page.locator('#age').fill(String(o.age));
  await page.locator('#weight').fill(String(o.weightKg));
  await page.locator(`button:has-text("${o.sex}")`).first().click();
  await page.locator('#height').fill(String(o.heightCm));
  await page.locator('#target-weight').fill(String(o.targetWeightKg));
  await clickText(page, /continue/i);

  // Step 3 — activity + fitness level
  await page.locator(`button:has-text("${o.activityLabel}")`).first().click();
  await page.locator(`button:has-text("${o.fitnessLabel}")`).first().click();
  await clickText(page, /continue/i);

  // Step 4 — training
  await page.locator('#days').fill(String(o.daysPerWeek));
  await clickText(page, /continue/i);

  // Step 5 — diet
  await page.locator(`button:has-text("${o.dietLabel}")`).first().click();
  if (o.allergies) await page.locator('#allergies').fill(o.allergies);
  await clickText(page, /create my plan/i);
}

/** Read the four metric cards off the rendered dashboard. */
async function readDashboard(page) {
  await page.waitForURL(/\/dashboard/, { timeout: 40000 });
  await page.waitForSelector('text=/Welcome back/i', { timeout: 30000 });
  const body = await page.locator('main').first().innerText();
  const cal = body.match(/([\d,]+)\s*\/\s*([\d,]+)\s*kcal/);
  const pro = body.match(/(\d+)g\s*\/\s*(\d+)g/);
  const wat = body.match(/([\d.]+)L\s*\/\s*([\d.]+)L/);
  return {
    text: body,
    caloriesConsumed: cal ? Number(cal[1].replace(/,/g, '')) : null,
    caloriesTarget: cal ? Number(cal[2].replace(/,/g, '')) : null,
    proteinConsumed: pro ? Number(pro[1]) : null,
    proteinTarget: pro ? Number(pro[2]) : null,
    waterTarget: wat ? Number(wat[2]) : null,
  };
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, extraHTTPHeaders: EXTRA_HEADERS });
const page = await context.newPage();

page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('response', (r) => {
  if (r.status() >= 500) networkErrors.push(`${r.status()} ${r.url()}`);
});

try {
  console.log('\n=== 1. Register USER A (muscle gain, vegetarian) ===');
  await register(page, USER_A);
  await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 30000 });
  check('registration lands in the app', /onboarding|dashboard/.test(page.url()), page.url());
  // The plan gate runs client-side after the profile query resolves.
  await page.waitForURL(/\/onboarding/, { timeout: 15000 }).catch(() => {});
  check('new user is routed to onboarding, not a zeroed dashboard', page.url().includes('/onboarding'), page.url());
  await shot(page, '01-onboarding');

  console.log('\n=== 2. Complete onboarding with a natural-language goal ===');
  await completeOnboarding(page, {
    goalText: 'I want to gain muscle',
    goalLabel: 'Build Muscle',
    age: 25, sex: 'male', heightCm: 175, weightKg: 65, targetWeightKg: 72,
    activityLabel: 'Very Active', fitnessLabel: 'Intermediate',
    daysPerWeek: 5, dietLabel: 'Vegetarian',
  });

  const a = await readDashboard(page);
  await shot(page, '02-dashboard-A');
  check('redirected to dashboard after save', page.url().includes('/dashboard'));
  check('dashboard shows a real calorie target', a.caloriesTarget > 0, String(a.caloriesTarget));
  check('dashboard shows a real protein target', a.proteinTarget > 0, String(a.proteinTarget));
  check('dashboard does NOT show 0/0', !/0\s*\/\s*0\s*kcal/.test(a.text));
  check('goal label reflects muscle building', /Muscle Building/i.test(a.text), a.text.slice(0, 200));
  check('no "Complete your personalized plan" prompt', !/Complete your personalized plan/i.test(a.text));
  console.log(`      USER A dashboard: ${a.caloriesConsumed}/${a.caloriesTarget} kcal, ${a.proteinConsumed}/${a.proteinTarget}g protein, ${a.waterTarget}L water`);

  console.log('\n=== 3. Missions and brief are goal-specific ===');
  check('missions rendered', /Today's Missions/i.test(a.text));
  check('muscle-gain user is told to REACH calories', /Reach [\d,]+ kcal/i.test(a.text), 'expected a calorie floor mission');
  check('AI daily brief rendered', /AI Daily Brief/i.test(a.text));
  check('what-should-I-eat card rendered', /What should I eat next/i.test(a.text));

  console.log('\n=== 4. Food suggestions respect the vegetarian diet ===');
  const suggestionBlock = a.text.split('What should I eat next?')[1]?.split('Recent Meals')[0] ?? '';
  check('no meat or fish suggested to a vegetarian',
    !/chicken|salmon|fish|beef|pork/i.test(suggestionBlock), suggestionBlock.slice(0, 200));
  check('estimates are labelled as estimates', /estimated values/i.test(suggestionBlock));

  console.log('\n=== 5. Log water from the dashboard, no reload ===');
  const beforeWater = a.text.match(/([\d.]+)L\s*\/\s*([\d.]+)L/)?.[1];
  await page.getByRole('button', { name: /Log 500 millilitres of water/i }).click();
  const afterWaterText = await waitFor(
    () => page.locator('main').first().innerText(),
    (t) => Number(t.match(/([\d.]+)L\s*\/\s*([\d.]+)L/)?.[1]) > Number(beforeWater));
  const afterWater = afterWaterText.match(/([\d.]+)L\s*\/\s*([\d.]+)L/)?.[1];
  check('water total increased without a page reload',
    Number(afterWater) > Number(beforeWater), `${beforeWater} -> ${afterWater}`);

  console.log('\n=== 6. Log a suggested meal (with confirmation step) ===');
  const beforeCals = Number(afterWaterText.match(/([\d,]+)\s*\/\s*[\d,]+\s*kcal/)?.[1].replace(/,/g, ''));
  await page.getByRole('button', { name: /Log .* as a meal/i }).first().click();
  await page.waitForTimeout(300);
  const confirmVisible = await page.getByRole('button', { name: /Confirm & log/i }).isVisible();
  check('estimates require explicit confirmation before logging', confirmVisible);
  await page.getByRole('button', { name: /Confirm & log/i }).click();
  const afterMealText = await waitFor(
    () => page.locator('main').first().innerText(),
    (t) => Number(t.match(/([\d,]+)\s*\/\s*[\d,]+\s*kcal/)?.[1].replace(/,/g, '')) > beforeCals);
  const afterCals = Number(afterMealText.match(/([\d,]+)\s*\/\s*[\d,]+\s*kcal/)?.[1].replace(/,/g, ''));
  check('calories increased after logging', afterCals > beforeCals, `${beforeCals} -> ${afterCals}`);
  check('meal appears in Recent Meals', /Recent Meals/i.test(afterMealText) && !/No meals logged today/i.test(afterMealText));
  await shot(page, '03-after-logging');

  console.log('\n=== 7. Record a weight measurement ===');
  await page.locator('#weight-input').fill('66.5');
  await page.getByRole('button', { name: /save weight/i }).click();
  const afterWeight = await waitFor(
    () => page.locator('main').first().innerText(),
    (t) => /66\.5\s*kg/.test(t));
  check('weight recorded and reflected', /66\.5\s*kg/.test(afterWeight), afterWeight.match(/[\d.]+ kg[^\n]*/)?.[0] ?? 'not found');

  console.log('\n=== 8. Profile shows the SAME plan ===');
  await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const profileText = await page.locator('main').first().innerText();
  await shot(page, '04-profile');
  check('profile shows the same calorie target', profileText.includes(String(a.caloriesTarget)),
    profileText.match(/[\d]+ kcal\/day/)?.[0] ?? 'not found');
  check('profile shows the same protein target', profileText.includes(String(a.proteinTarget)));
  check('profile does not show a placeholder 2000', !/2000 kcal\/day/.test(profileText) || a.caloriesTarget === 2000);

  console.log('\n=== 9. Stats and Tracker load against the same plan ===');
  await page.goto(`${BASE}/stats`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const statsText = await page.locator('body').innerText();
  check('stats page renders without an error screen', !/Failed to load statistics/i.test(statsText), statsText.slice(0, 150));
  await shot(page, '05-stats');

  await page.goto(`${BASE}/tracker`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const trackerText = await page.locator('body').innerText();
  check('tracker shows the same calorie target', trackerText.includes(String(a.caloriesTarget)),
    trackerText.match(/\d+\s*\/\s*\d+/)?.[0] ?? 'not found');
  check('tracker does not fall back to 2000', !/\/\s*2000/.test(trackerText) || a.caloriesTarget === 2000);
  await shot(page, '06-tracker');

  console.log('\n=== 10. AI Coach loads ===');
  await page.goto(`${BASE}/ai-coach`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const coachText = await page.locator('body').innerText();
  check('AI coach page renders', coachText.length > 200);
  await shot(page, '07-aicoach');

  console.log('\n=== 11. Refresh preserves everything ===');
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  const refreshed = await readDashboard(page);
  check('calorie target survives refresh', refreshed.caloriesTarget === a.caloriesTarget,
    `${a.caloriesTarget} -> ${refreshed.caloriesTarget}`);
  check('logged calories survive refresh', refreshed.caloriesConsumed === afterCals,
    `${afterCals} -> ${refreshed.caloriesConsumed}`);

  console.log('\n=== 12. Logout then login again ===');
  await page.getByRole('button', { name: /open user menu|user menu|account/i }).first().click().catch(async () => {
    await page.locator('header button').last().click();
  });
  await page.waitForTimeout(600);
  await page.getByText(/logout/i).first().click();
  await page.waitForTimeout(2500);
  const afterLogout = page.url();
  check('logout redirects away from the dashboard', !afterLogout.includes('/dashboard'), afterLogout);

  await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /^login$/i }).first().click();
  await page.waitForTimeout(400);
  await page.locator('input[autocomplete="username"]').fill(USER_A.username);
  await page.locator('input[autocomplete="current-password"]').fill(USER_A.password);
  await clickText(page, /sign in/i);
  await page.waitForURL(/\/dashboard/, { timeout: 40000 }).catch(() => {});
  // Wait for the metric cards to actually carry the restored plan.
  await waitFor(
    () => page.locator('main').first().innerText().catch(() => ''),
    (t) => /\d[\d,]*\s*\/\s*[\d,]+\s*kcal/.test(t),
    { timeout: 40000 });
  await shot(page, '08a-relogin-state');
  const relogged = await readDashboard(page);
  check('plan survives logout/login', relogged.caloriesTarget === a.caloriesTarget,
    `${a.caloriesTarget} -> ${relogged.caloriesTarget}`);
  check('logged food survives logout/login', relogged.caloriesConsumed === afterCals);
  await shot(page, '08-after-relogin');

  console.log('\n=== 13. USER B gets a DIFFERENT plan (weight loss) ===');
  const ctxB = await browser.newContext({ viewport: { width: 1440, height: 1000 }, extraHTTPHeaders: EXTRA_HEADERS });
  const pageB = await ctxB.newPage();
  pageB.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`[B] ${m.text()}`); });
  await register(pageB, USER_B);
  await completeOnboarding(pageB, {
    goalText: 'I want to lose weight',
    goalLabel: 'Lose Weight',
    age: 30, sex: 'female', heightCm: 175, weightKg: 85, targetWeightKg: 72,
    activityLabel: 'Moderately Active', fitnessLabel: 'Beginner',
    daysPerWeek: 3, dietLabel: 'No restriction', allergies: 'peanuts',
  });
  const b = await readDashboard(pageB);
  await shot(pageB, '09-dashboard-B');
  console.log(`      USER B dashboard: ${b.caloriesConsumed}/${b.caloriesTarget} kcal, ${b.proteinConsumed}/${b.proteinTarget}g protein, ${b.waterTarget}L water`);

  check('USER B calorie target differs from USER A', b.caloriesTarget !== a.caloriesTarget, `${a.caloriesTarget} vs ${b.caloriesTarget}`);
  check('USER B protein target differs', b.proteinTarget !== a.proteinTarget, `${a.proteinTarget} vs ${b.proteinTarget}`);
  check('USER B water target differs', b.waterTarget !== a.waterTarget, `${a.waterTarget} vs ${b.waterTarget}`);
  check('USER B goal label is weight loss', /Weight Loss/i.test(b.text));
  check('weight-loss user gets a calorie CEILING mission', /Stay within [\d,]+ kcal/i.test(b.text));
  check('USER B sees no USER A data', !b.text.includes(String(a.caloriesTarget)));

  const bSuggestions = b.text.split('What should I eat next?')[1]?.split('Recent Meals')[0] ?? '';
  check('peanut-allergic user is never offered peanut', !/peanut/i.test(bSuggestions), bSuggestions.slice(0, 200));

  await ctxB.close();

  console.log('\n=== 14. Console / network health ===');
  const realConsoleErrors = consoleErrors.filter((e) =>
    !/favicon|Download the React DevTools|WebSocket|HMR|vite/i.test(e) &&
    // Signed-out probes of /api/user answer 401 by design; the browser logs
    // every non-2xx fetch, so these are expected noise rather than failures.
    !/status of 401/i.test(e));
  check('no server 5xx responses', networkErrors.length === 0, networkErrors.join(', '));
  check('no unexpected console errors', realConsoleErrors.length === 0, realConsoleErrors.slice(0, 3).join(' | '));

} catch (err) {
  failed++;
  console.log(`\n  FATAL: ${err.message}`);
  await shot(page, 'zz-failure');
} finally {
  await browser.close();
}

console.log(`\n${passed} passed, ${failed} failed`);
console.log(JSON.stringify({ cleanupUsers: [USER_A.username, USER_B.username] }));
process.exit(failed > 0 ? 1 : 0);
