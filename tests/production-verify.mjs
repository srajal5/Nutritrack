/**
 * Verifies the DEPLOYED application end to end.
 *
 * Focused on the production-only failure: multi-segment /api paths were being
 * 404'd by the platform router before Express saw them, so the Dashboard broke
 * while single-segment endpoints like /api/user-profile kept working.
 *
 * Usage:  node tests/production-verify.mjs [baseUrl]
 * Creates two throwaway users and reports their names for cleanup.
 */
const BASE = process.argv[2] || process.env.PROD_URL || 'https://nutritrack-eight.vercel.app';

let passed = 0, failed = 0;
function check(name, ok, detail = '') {
  if (ok) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}${detail ? ` -- ${detail}` : ''}`); }
}

function client() {
  let cookie = '';
  return async function call(method, path, body) {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'manual',
    });
    const sc = res.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0];
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* html or empty */ }
    return { status: res.status, json, text, headers: res.headers };
  };
}

const stamp = Date.now();
const A = {
  creds: { username: `prodv_a_${stamp}`, email: `prodv_a_${stamp}@x.com`, password: 'secret123' },
  onboarding: {
    profile: { age: 25, biologicalSex: 'male', height: 175, heightUnit: 'cm', weightKg: 70, targetWeightKg: 76, activityLevel: 'MODERATE', fitnessLevel: 'INTERMEDIATE' },
    goal: { primaryGoal: 'BUILD_MUSCLE', goalDescription: 'I want to gain muscle' },
    workout: { daysPerWeek: 4, location: 'GYM', equipment: [] },
    nutrition: { dietaryPreference: 'VEGETARIAN', allergies: [], dislikedFoods: [], preferredFoods: [], mealsPerDay: 4 },
  },
};
const B = {
  creds: { username: `prodv_b_${stamp}`, email: `prodv_b_${stamp}@x.com`, password: 'secret123' },
  onboarding: {
    profile: { age: 30, biologicalSex: 'female', height: 165, heightUnit: 'cm', weightKg: 85, targetWeightKg: 72, activityLevel: 'LIGHT', fitnessLevel: 'BEGINNER' },
    goal: { primaryGoal: 'LOSE_WEIGHT', goalDescription: 'I want to lose weight' },
    workout: { daysPerWeek: 3, location: 'HOME', equipment: [] },
    nutrition: { dietaryPreference: 'NO_RESTRICTION', allergies: ['peanuts'], dislikedFoods: [], preferredFoods: [], mealsPerDay: 3 },
  },
};

console.log(`\nVerifying ${BASE}\n`);

console.log('=== 1. Multi-segment /api paths reach the app (the production bug) ===');
{
  const anon = client();
  for (const p of ['/api/dashboard/1', '/api/food-entries/weekly', '/api/food-entries/daily', '/api/chat/messages']) {
    const r = await anon('GET', p);
    check(`${p} is routed to the app (not a platform 404)`, r.status !== 404, `HTTP ${r.status}`);
  }
  const h = await anon('GET', '/api/health');
  check('/api/health still works (single segment)', h.status === 200 && h.json?.ok === true);
}

console.log('\n=== 2. USER A: register -> onboarding -> dashboard ===');
const a = client();
let planA, idA;
{
  const reg = await a('POST', '/api/register', A.creds);
  check('registration succeeds', reg.status === 201, `HTTP ${reg.status}`);
  idA = reg.json?.user?.id;

  const before = await a('GET', `/api/dashboard/${idA}`);
  check('dashboard reachable before onboarding', before.status === 200, `HTTP ${before.status}`);
  check('reports missing plan rather than zeros', before.json?.planStatus === 'missing_profile', String(before.json?.planStatus));

  const save = await a('PUT', '/api/user-profile', A.onboarding);
  check('onboarding persists', save.status === 200 && save.json?.success === true, `HTTP ${save.status}`);
  planA = save.json?.plan;

  const dash = await a('GET', `/api/dashboard/${idA}`);
  check('dashboard returns 200 after onboarding', dash.status === 200, `HTTP ${dash.status}`);
  check('planStatus ready', dash.json?.planStatus === 'ready', String(dash.json?.planStatus));
  check('calorie target > 0', dash.json?.plan?.targets?.calories > 0, String(dash.json?.plan?.targets?.calories));
  check('protein target > 0', dash.json?.plan?.targets?.proteinGrams > 0);
  check('water target > 0', dash.json?.plan?.targets?.waterMl > 0);
  check('carbs populated', dash.json?.plan?.targets?.carbsGrams > 0);
  check('fat populated', dash.json?.plan?.targets?.fatGrams > 0);
  check('dashboard matches the saved plan',
    dash.json?.plan?.targets?.calories === planA?.targets?.calories,
    `${planA?.targets?.calories} vs ${dash.json?.plan?.targets?.calories}`);
  console.log(`      USER A: ${planA.targets.calories} kcal, ${planA.targets.proteinGrams}g protein, ${planA.targets.waterMl}ml water, ${planA.goal.primaryGoal}`);
}

console.log('\n=== 3. Profile and Dashboard agree in production ===');
{
  const prof = await a('GET', '/api/user-profile');
  const dash = await a('GET', `/api/dashboard/${idA}`);
  check('profile exposes resolvedPlan', !!prof.json?.resolvedPlan);
  check('same calorie target', prof.json?.resolvedPlan?.targets?.calories === dash.json?.plan?.targets?.calories,
    `${prof.json?.resolvedPlan?.targets?.calories} vs ${dash.json?.plan?.targets?.calories}`);
  check('same protein target', prof.json?.resolvedPlan?.targets?.proteinGrams === dash.json?.plan?.targets?.proteinGrams);
  check('same goal', prof.json?.resolvedPlan?.goal?.primaryGoal === dash.json?.plan?.goal?.primaryGoal);
}

console.log('\n=== 4. Previously-404ing endpoints now work for a real session ===');
{
  const weekly = await a('GET', '/api/food-entries/weekly');
  check('/api/food-entries/weekly returns data', weekly.status === 200 && Array.isArray(weekly.json), `HTTP ${weekly.status}`);
  check('weekly has 7 buckets', weekly.json?.length === 7, String(weekly.json?.length));
  const daily = await a('GET', '/api/food-entries/daily');
  check('/api/food-entries/daily returns a summary', daily.status === 200, `HTTP ${daily.status}`);
}

console.log('\n=== 5. Food logging updates the dashboard in production ===');
{
  const before = (await a('GET', `/api/dashboard/${idA}`)).json;
  const add = await a('POST', '/api/food-entries', {
    name: 'Prod verify meal', servingSize: '1 plate', mealType: 'lunch',
    calories: 500, protein: 35, carbs: 50, fat: 15, entryDate: new Date().toISOString(),
  });
  check('food entry created', add.status === 201 || add.status === 200, `HTTP ${add.status}`);
  const after = (await a('GET', `/api/dashboard/${idA}`)).json;
  check('calories increased by 500', after.today.calories === before.today.calories + 500,
    `${before.today.calories} -> ${after.today.calories}`);
  check('progress recalculated', after.progress.caloriesPct > before.progress.caloriesPct);

  const water = await a('POST', '/api/food-entries/water', { amountMl: 500 });
  check('water logged', water.status === 201, `HTTP ${water.status}`);
  const afterWater = (await a('GET', `/api/dashboard/${idA}`)).json;
  check('water increased by 500ml', afterWater.today.waterMl === after.today.waterMl + 500,
    `${after.today.waterMl} -> ${afterWater.today.waterMl}`);
}

console.log('\n=== 6. Stats reachable in production ===');
{
  const stats = await a('GET', '/api/stats');
  check('/api/stats returns 200 for a user with a plan', stats.status === 200, `HTTP ${stats.status}`);
  check('stats calorie goal matches the plan',
    stats.json?.goals?.find((g) => g.name === 'Daily Calories')?.target === planA.targets.calories,
    String(stats.json?.goals?.find((g) => g.name === 'Daily Calories')?.target));
}

console.log('\n=== 7. USER B gets a different plan; no cross-user leakage ===');
const b = client();
let planB, idB;
{
  const reg = await b('POST', '/api/register', B.creds);
  idB = reg.json?.user?.id;
  const save = await b('PUT', '/api/user-profile', B.onboarding);
  planB = save.json?.plan;
  console.log(`      USER B: ${planB.targets.calories} kcal, ${planB.targets.proteinGrams}g protein, ${planB.targets.waterMl}ml water, ${planB.goal.primaryGoal}`);

  check('calorie targets differ', planA.targets.calories !== planB.targets.calories,
    `${planA.targets.calories} vs ${planB.targets.calories}`);
  check('protein targets differ', planA.targets.proteinGrams !== planB.targets.proteinGrams);
  check('water targets differ', planA.targets.waterMl !== planB.targets.waterMl);
  check('goals differ', planA.goal.primaryGoal !== planB.goal.primaryGoal);

  const cross = await a('GET', `/api/dashboard/${idB}`);
  check('user A cannot read user B dashboard', cross.status === 403, `HTTP ${cross.status}`);

  const dashB = (await b('GET', `/api/dashboard/${idB}`)).json;
  check('user B dashboard shows user B plan', dashB.plan.targets.calories === planB.targets.calories);
  check('user B suggestions avoid their peanut allergy',
    !(dashB.foodSuggestions || []).some((s) => /peanut/i.test(s.name)),
    JSON.stringify((dashB.foodSuggestions || []).map((s) => s.name)));
}

console.log('\n=== 8. Persistence across logout / login ===');
{
  const out = await a('POST', '/api/logout');
  check('logout succeeds', out.status === 200);
  const blocked = await a('GET', `/api/dashboard/${idA}`);
  check('dashboard blocked once logged out', blocked.status === 401, `HTTP ${blocked.status}`);

  const back = client();
  const login = await back('POST', '/api/login', { username: A.creds.username, password: A.creds.password });
  check('login succeeds', login.status === 200);
  const dash = await back('GET', `/api/dashboard/${login.json.user.id}`);
  check('plan survives logout/login', dash.json?.plan?.targets?.calories === planA.targets.calories,
    `${dash.json?.plan?.targets?.calories}`);
  check('logged food survives', dash.json?.today?.calories === 500, String(dash.json?.today?.calories));
  check('logged water survives', dash.json?.today?.waterMl === 500, String(dash.json?.today?.waterMl));
}

console.log('\n=== 9. Dashboard responses are not shared between users by a cache ===');
{
  const dashA = (await client() && null);
  const a2 = client();
  await a2('POST', '/api/login', { username: A.creds.username, password: A.creds.password });
  const r1 = await a2('GET', `/api/dashboard/${idA}`);
  const b2 = client();
  await b2('POST', '/api/login', { username: B.creds.username, password: B.creds.password });
  const r2 = await b2('GET', `/api/dashboard/${idB}`);
  check('each user receives their own targets',
    r1.json.plan.targets.calories !== r2.json.plan.targets.calories,
    `${r1.json.plan.targets.calories} vs ${r2.json.plan.targets.calories}`);
  check('dashboard is served no-store', /no-store/.test(r1.headers.get('cache-control') || ''),
    r1.headers.get('cache-control') || 'none');
}

console.log(`\n${passed} passed, ${failed} failed`);
console.log(JSON.stringify({ cleanupUsers: [A.creds.username, B.creds.username] }));
process.exit(failed > 0 ? 1 : 0);
