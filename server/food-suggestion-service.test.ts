/**
 * Diet and allergy filtering are safety-critical, so they get their own tests.
 * Run with:  npx tsx server/food-suggestion-service.test.ts
 */
import { buildFoodSuggestions } from './food-suggestion-service.js';
import type { PersonalizedPlan, DailyNutrition } from '../shared/types.js';

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}${detail ? ` -- ${detail}` : ''}`); }
}

const plan = (goal: PersonalizedPlan['goal']['primaryGoal']): PersonalizedPlan => ({
  planVersion: 2,
  generatedAt: new Date().toISOString(),
  goal: { primaryGoal: goal },
  targets: { calories: 2400, proteinGrams: 150, carbsGrams: 250, fatGrams: 75, fiberGrams: 34, waterMl: 3000 },
  basis: { bmr: 1700, tdee: 2600, goalAdjustment: -200, proteinGramsPerKg: 2.0 },
  focusAreas: [], weeklyWorkoutPlan: [], nutritionGuidelines: [],
});

const today: DailyNutrition = { calories: 1780, protein: 115, carbs: 180, fat: 55, fiber: 20, sugar: 30, waterMl: 1900 };

const base = {
  plan: plan('BUILD_MUSCLE'), today,
  allergies: [] as string[], dislikedFoods: [] as string[], preferredFoods: [] as string[],
  mealType: 'snack',
};

const namesOf = (s: { name: string }[]) => s.map((x) => x.name.toLowerCase()).join(' | ');

console.log('\nDietary preferences are hard constraints');
const veg = buildFoodSuggestions({ ...base, dietaryPreference: 'VEGETARIAN' });
check('vegetarian: never suggests chicken/fish/meat',
  !/chicken|salmon|fish|meat/.test(namesOf(veg)), namesOf(veg));
check('vegetarian: still returns options', veg.length > 0);

const vegan = buildFoodSuggestions({ ...base, dietaryPreference: 'VEGAN' });
check('vegan: no eggs or dairy',
  !/egg|yogurt|paneer|cottage cheese|whey|milk/.test(namesOf(vegan)), namesOf(vegan));
check('vegan: still returns options', vegan.length > 0);

const omni = buildFoodSuggestions({ ...base, dietaryPreference: 'NO_RESTRICTION' });
check('no restriction: animal protein is allowed', omni.length > 0);

console.log('\nAllergies are never suggested');
const nutAllergy = buildFoodSuggestions({ ...base, dietaryPreference: 'NO_RESTRICTION', allergies: ['nuts'] });
check('nut allergy: no walnuts/almonds/peanut',
  !/walnut|almond|peanut/.test(namesOf(nutAllergy)), namesOf(nutAllergy));

const dairyAllergy = buildFoodSuggestions({ ...base, dietaryPreference: 'VEGETARIAN', allergies: ['dairy'] });
check('dairy allergy on a vegetarian diet: no dairy items',
  !/yogurt|paneer|cottage cheese|whey|milk/.test(namesOf(dairyAllergy)), namesOf(dairyAllergy));

console.log('\nDislikes are avoided, preferences promoted');
const disliked = buildFoodSuggestions({ ...base, dietaryPreference: 'NO_RESTRICTION', dislikedFoods: ['tofu', 'salmon'] });
check('disliked foods excluded', !/tofu|salmon/.test(namesOf(disliked)), namesOf(disliked));

const preferred = buildFoodSuggestions({ ...base, dietaryPreference: 'VEGETARIAN', preferredFoods: ['paneer'] });
check('preferred food is surfaced', /paneer/.test(namesOf(preferred)), namesOf(preferred));

console.log('\nSuggestions respond to remaining macros and goal');
const lowProteinLeft = buildFoodSuggestions({
  ...base, dietaryPreference: 'NO_RESTRICTION',
  today: { ...today, protein: 145 },
});
const highProteinLeft = buildFoodSuggestions({
  ...base, dietaryPreference: 'NO_RESTRICTION',
  today: { ...today, protein: 40 },
});
check('suggestion set changes with remaining protein',
  namesOf(lowProteinLeft) !== namesOf(highProteinLeft),
  `${namesOf(lowProteinLeft)} VS ${namesOf(highProteinLeft)}`);

const vegSet = new Set(veg.map((v) => v.name));
const omniSet = new Set(omni.map((v) => v.name));
check('vegetarian and omnivore users get different suggestions',
  [...omniSet].some((n) => !vegSet.has(n)));

console.log('\nEstimates are labelled');
check('every suggestion is flagged as an estimate', omni.every((s) => s.isEstimate === true));
check('every suggestion carries macros',
  omni.every((s) => s.estimatedCalories > 0 && s.estimatedProteinGrams >= 0));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
