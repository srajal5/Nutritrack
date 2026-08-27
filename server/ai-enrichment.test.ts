/**
 * The AI enrichment layer must never become a safety hole or a source of
 * invented statistics. These tests exercise it against a stubbed model.
 * Run with:  npx tsx server/ai-enrichment.test.ts
 */
import { enrichFoodSuggestions, enrichDailyBrief, setJsonCaller } from './ai-enrichment.js';
import type { PersonalizedPlan, DailyNutrition, FoodSuggestion, AIInsight } from '../shared/types.js';

let passed = 0, failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}${detail ? ` -- ${detail}` : ''}`); }
}

const plan: PersonalizedPlan = {
  planVersion: 2, generatedAt: new Date().toISOString(),
  goal: { primaryGoal: 'BUILD_MUSCLE' },
  targets: { calories: 2400, proteinGrams: 150, carbsGrams: 250, fatGrams: 75, fiberGrams: 34, waterMl: 3000 },
  basis: { bmr: 1700, tdee: 2100, goalAdjustment: 300, proteinGramsPerKg: 2.2 },
  focusAreas: ['protein', 'hydration'], weeklyWorkoutPlan: [], nutritionGuidelines: [],
};
const today: DailyNutrition = { calories: 1780, protein: 115, carbs: 180, fat: 52, fiber: 20, sugar: 30, waterMl: 1900 };

const safe: FoodSuggestion[] = [
  { name: 'Greek yogurt with berries', reason: 'd1', estimatedCalories: 280, estimatedProteinGrams: 25, estimatedCarbsGrams: 30, estimatedFatGrams: 6, isEstimate: true },
  { name: 'Tofu stir-fry with vegetables', reason: 'd2', estimatedCalories: 340, estimatedProteinGrams: 22, estimatedCarbsGrams: 28, estimatedFatGrams: 15, isEstimate: true },
];

// Substitute the model with a stub via the exported test seam.
function stub(fn: () => Promise<unknown>) { setJsonCaller(fn); }

const remaining = { calories: 620, protein: 35, carbs: 70, fat: 23 };
const ctx = { dietaryPreference: 'VEGETARIAN', allergies: ['peanuts'], preferredFoods: [], mealType: 'snack' };

console.log('\nAI cannot introduce unsafe foods');
{
  // The model tries to smuggle in chicken and peanut butter, neither of which
  // was in the filtered candidate list.
  stub(async () => ({ ranking: [
    { name: 'Grilled chicken breast', reason: 'high protein' },
    { name: 'Peanut butter toast', reason: 'calorie dense' },
    { name: 'Tofu stir-fry with vegetables', reason: 'plant protein' },
  ]}));
  const out = await enrichFoodSuggestions(safe, plan, remaining, ctx);
  const names = out.map((o) => o.name.toLowerCase()).join(' | ');
  check('foods not in the safe list are discarded', !/chicken|peanut/.test(names), names);
  check('only safe candidates survive', out.every((o) => safe.some((s) => s.name === o.name)));
  check('nothing safe is lost', out.length === safe.length, `${out.length}`);
  check('AI ordering is honoured', out[0].name === 'Tofu stir-fry with vegetables', out[0].name);
  check('AI-written reason is used', out[0].reason === 'plant protein');
  check('macros are NOT taken from the model', out[0].estimatedCalories === 340);
}

console.log('\nAI failure falls back to deterministic order');
{
  stub(async () => { throw new Error('model down'); });
  const out = await enrichFoodSuggestions(safe, plan, remaining, ctx);
  check('returns the deterministic list unchanged', JSON.stringify(out) === JSON.stringify(safe));
}

console.log('\nMalformed AI output is rejected');
{
  stub(async () => ({ nonsense: true }));
  const out = await enrichFoodSuggestions(safe, plan, remaining, ctx);
  check('schema violation falls back safely', JSON.stringify(out) === JSON.stringify(safe));
}

const deterministicBrief: AIInsight = {
  headline: "You're 35g short of your protein target.",
  body: 'A protein-rich snack would close the gap.',
  focusAreas: ['protein', 'hydration'], isFallback: true,
};

console.log('\nDaily brief rejects invented statistics');
{
  stub(async () => ({ headline: 'Great work!', body: 'Your protein consistency improved 18% this week. Keep going.' }));
  const out = await enrichDailyBrief(deterministicBrief, plan, today);
  check('fabricated week-over-week claim rejected', out.isFallback === true && out.headline === deterministicBrief.headline, out.headline);
}
{
  stub(async () => ({ headline: 'On track', body: 'You are at 42% of your calorie target so far.' }));
  const out = await enrichDailyBrief(deterministicBrief, plan, today);
  check('unsupported percentage rejected', out.isFallback === true, `${out.body}`);
}
{
  // 1780/2400 = 74%, 115/150 = 77% — both real, so this must be accepted.
  stub(async () => ({ headline: 'Solid progress today', body: 'You are at 74% of calories and 77% of protein. A yogurt would close the gap.' }));
  const out = await enrichDailyBrief(deterministicBrief, plan, today);
  check('accurate percentages are accepted', out.isFallback === false, `${out.body}`);
  check('enriched copy is used', out.headline === 'Solid progress today');
  check('focus areas preserved from deterministic layer', out.focusAreas.join() === 'protein,hydration');
}
{
  stub(async () => { throw new Error('timeout'); });
  const out = await enrichDailyBrief(deterministicBrief, plan, today);
  check('AI outage keeps the deterministic brief', out.headline === deterministicBrief.headline && out.isFallback === true);
}

setJsonCaller();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
