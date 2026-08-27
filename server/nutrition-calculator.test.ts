/**
 * Independent tests for the deterministic nutrition calculator.
 * Run with:  npx tsx server/nutrition-calculator.test.ts
 *
 * No test runner dependency, so this works in the existing toolchain as-is.
 */
import {
  calculateNutritionTargets,
  validateCalculationInput,
  normalizeHeightToCm,
  interpretGoalText,
  InvalidProfileError,
  type CalculationInput,
} from './nutrition-calculator.js';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = '') {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? ` -- ${detail}` : ''}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

// The two users from the end-to-end scenario in the brief.
const USER_A: CalculationInput = {
  age: 26, biologicalSex: 'male', heightCm: 178, weightKg: 70,
  activityLevel: 'ACTIVE', goal: 'BUILD_MUSCLE',
};
const USER_B: CalculationInput = {
  age: 34, biologicalSex: 'female', heightCm: 165, weightKg: 90,
  activityLevel: 'MODERATE', goal: 'LOSE_WEIGHT',
};

section('Validation rejects incomplete or impossible profiles');
check('empty profile lists every required field',
  validateCalculationInput({}).length === 6);
check('height of 6 (feet typed into a cm field) is rejected',
  validateCalculationInput({ ...USER_A, heightCm: 6 }).includes('heightCm'));
check('missing biological sex is reported',
  validateCalculationInput({ ...USER_A, biologicalSex: undefined }).includes('biologicalSex'));
check('a complete profile reports nothing missing',
  validateCalculationInput(USER_A).length === 0);

let threw = false;
try { calculateNutritionTargets({ ...USER_A, heightCm: 6 }); } catch (e) { threw = e instanceof InvalidProfileError; }
check('calculating from an invalid profile throws rather than guessing', threw);

section('Height normalisation');
check('6 is read as feet -> 183cm', normalizeHeightToCm(6) === 183);
check('5.6ft -> 171cm', normalizeHeightToCm(5.6) === 171);
check('178 stays 178cm', normalizeHeightToCm(178) === 178);
check('explicit cm unit is respected', normalizeHeightToCm(168, 'cm') === 168);
check('nonsense returns null', normalizeHeightToCm(0) === null);

section('Goal interpretation from natural language');
check('"gain muscle and lose fat" -> BODY_RECOMPOSITION',
  interpretGoalText('I want to gain muscle and lose fat') === 'BODY_RECOMPOSITION');
check('"I want to lose weight" -> LOSE_WEIGHT',
  interpretGoalText('I want to lose weight') === 'LOSE_WEIGHT');
check('"I want to gain muscle" -> BUILD_MUSCLE',
  interpretGoalText('I want to gain muscle') === 'BUILD_MUSCLE');
check('"maintain my current weight" -> MAINTAIN_WEIGHT',
  interpretGoalText('I want to maintain my current weight') === 'MAINTAIN_WEIGHT');
check('unrelated text -> null (never invents a goal)',
  interpretGoalText('hello there') === null);

// Phrasings that must NOT collapse to one generic goal.
const PHRASINGS: [string, string | null][] = [
  ['I want to gain muscle and lose fat and train 4 days per week', 'BODY_RECOMPOSITION'],
  ['I want to lose weight as quickly as reasonably possible', 'LOSE_WEIGHT'],
  ['I want to maintain my current weight and improve fitness', 'MAINTAIN_WEIGHT'],
  ['I want to build muscle and train 4 days per week', 'BUILD_MUSCLE'],
  ['I want to lose weight and improve endurance', 'LOSE_WEIGHT'],
];
for (const [text, expected] of PHRASINGS) {
  check(`"${text.slice(0, 42)}…" -> ${expected}`, interpretGoalText(text) === expected, String(interpretGoalText(text)));
}
check('distinct phrasings do not all yield the same goal',
  new Set(PHRASINGS.map(([t]) => interpretGoalText(t))).size >= 3);

section('Different users receive genuinely different plans');
const a = calculateNutritionTargets(USER_A);
const b = calculateNutritionTargets(USER_B);
console.log(`  USER A (muscle gain): ${a.targets.calories} kcal, ${a.targets.proteinGrams}g protein, ${a.targets.waterMl}ml water`);
console.log(`  USER B (weight loss): ${b.targets.calories} kcal, ${b.targets.proteinGrams}g protein, ${b.targets.waterMl}ml water`);
check('calorie targets differ', a.targets.calories !== b.targets.calories);
check('protein targets differ', a.targets.proteinGrams !== b.targets.proteinGrams);
check('water targets differ', a.targets.waterMl !== b.targets.waterMl);
check('muscle gain is above maintenance', a.targets.calories > a.basis.tdee);
check('weight loss is below maintenance', b.targets.calories < b.basis.tdee);

section('Goal direction is respected for one fixed person');
const base = { age: 30, biologicalSex: 'male', heightCm: 175, weightKg: 80, activityLevel: 'MODERATE' } as const;
const lose = calculateNutritionTargets({ ...base, goal: 'LOSE_WEIGHT' });
const gain = calculateNutritionTargets({ ...base, goal: 'BUILD_MUSCLE' });
const maintain = calculateNutritionTargets({ ...base, goal: 'MAINTAIN_WEIGHT' });
const recomp = calculateNutritionTargets({ ...base, goal: 'BODY_RECOMPOSITION' });
console.log(`  lose=${lose.targets.calories}  maintain=${maintain.targets.calories}  gain=${gain.targets.calories}  recomp=${recomp.targets.calories}`);
check('lose < maintain < gain', lose.targets.calories < maintain.targets.calories && maintain.targets.calories < gain.targets.calories);
check('maintenance equals TDEE', maintain.targets.calories === maintain.basis.tdee);
check('recomposition sits near maintenance', Math.abs(recomp.targets.calories - maintain.basis.tdee) <= 150);
check('recomposition uses the highest protein',
  recomp.targets.proteinGrams > gain.targets.proteinGrams && recomp.targets.proteinGrams > lose.targets.proteinGrams);

section('Safety floors');
const tiny = calculateNutritionTargets({ age: 25, biologicalSex: 'female', heightCm: 150, weightKg: 45, activityLevel: 'SEDENTARY', goal: 'LOSE_WEIGHT' });
check('deficit never exceeds 25% below TDEE', tiny.targets.calories >= Math.round(tiny.basis.tdee * 0.75));
check('never below the absolute female floor', tiny.targets.calories >= 1200);

section('Macros are internally consistent');
for (const [label, r] of [['A', a], ['B', b], ['recomp', recomp]] as const) {
  const kcal = r.targets.proteinGrams * 4 + r.targets.carbsGrams * 4 + r.targets.fatGrams * 9;
  check(`${label}: macros sum to within 2% of the calorie target`,
    Math.abs(kcal - r.targets.calories) / r.targets.calories < 0.02,
    `macros=${kcal} target=${r.targets.calories}`);
}

section('Determinism');
check('same input yields identical output',
  JSON.stringify(calculateNutritionTargets(USER_A)) === JSON.stringify(a));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
