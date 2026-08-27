/**
 * Guards against the "NaN%" / "Infinity%" class of bug that appears whenever a
 * component divides intake by a target the user does not have.
 * Run with:  npx tsx shared/nutrition-math.test.ts
 */
import { safePct, barPct, formatPct, hasUsableTargets } from './nutrition-math.js';

let passed = 0, failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) { passed++; console.log(`  PASS  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}${detail ? ` -- ${detail}` : ''}`); }
}

// The canonical fixture used across the component regression tests.
const TARGETS = { calories: 2400, protein: 150, carbs: 260, fat: 75, water: 3000 };
const TODAY = { calories: 1780, protein: 115, carbs: 190, fat: 52, water: 1900 };

console.log('\nRealistic canonical data produces the expected percentages');
check('calories 1780/2400 -> 74%', safePct(TODAY.calories, TARGETS.calories) === 74);
check('protein 115/150 -> 77%', safePct(TODAY.protein, TARGETS.protein) === 77);
check('carbs 190/260 -> 73%', safePct(TODAY.carbs, TARGETS.carbs) === 73);
check('fat 52/75 -> 69%', safePct(TODAY.fat, TARGETS.fat) === 69);
check('water 1900/3000 -> 63%', safePct(TODAY.water, TARGETS.water) === 63);

console.log('\nMissing targets never render as a number');
check('0 consumed / 0 target -> null (not NaN)', safePct(0, 0) === null);
check('1780 consumed / 0 target -> null (not Infinity)', safePct(1780, 0) === null);
check('negative target -> null', safePct(100, -5) === null);
check('NaN input -> null', safePct(NaN, 2400) === null);
check('formatPct with no target shows a dash', formatPct(1780, 0) === '—');
check('formatPct with a target shows a percentage', formatPct(1780, 2400) === '74%');

console.log('\nValid zero consumption is distinct from a missing target');
check('0 / 2400 is 0%, not null', safePct(0, 2400) === 0);
check('0 / 2400 formats as "0%"', formatPct(0, 2400) === '0%');

console.log('\nBar percentages are clamped for display');
check('under target is unclamped', barPct(1780, 2400) === 74);
check('over target clamps to 100', barPct(3000, 2400) === 100);
check('missing target renders an empty bar', barPct(1780, 0) === 0);
check('never negative', barPct(-50, 2400) === 0);
check('exactly on target is 100', barPct(2400, 2400) === 100);

console.log('\nTarget availability check');
check('full targets are usable', hasUsableTargets({ calorieGoal: 2400, proteinGoal: 150 }));
check('zero calorie target is not usable', !hasUsableTargets({ calorieGoal: 0, proteinGoal: 150 }));
check('zero protein target is not usable', !hasUsableTargets({ calorieGoal: 2400, proteinGoal: 0 }));
check('null is not usable', !hasUsableTargets(null));
check('undefined is not usable', !hasUsableTargets(undefined));

console.log('\nOverachievement is reported honestly in text');
check('125% is reported as 125%, not clamped', safePct(3000, 2400) === 125);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
