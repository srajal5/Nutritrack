import type {
  ActivityLevel,
  BiologicalSex,
  CalculationBasis,
  DailyTargets,
  PrimaryGoal,
} from '../shared/types.js';

export interface CalculationInput {
  age: number;
  biologicalSex: BiologicalSex;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: PrimaryGoal;
}

export interface CalculationResult {
  targets: DailyTargets;
  basis: CalculationBasis;
}

/**
 * Plausible human ranges. Input outside these is rejected rather than clamped,
 * because clamping is what produced the original bug: users who typed their
 * height in feet ("6") got a nonsense BMR, which fell through to the calorie
 * floor, so completely different people all received an identical 1500 kcal
 * plan. Refusing bad input surfaces the problem instead of hiding it.
 */
export const LIMITS = {
  age: { min: 13, max: 100 },
  heightCm: { min: 120, max: 250 },
  weightKg: { min: 30, max: 300 },
} as const;

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

/**
 * Goal-specific calorie adjustment and protein target.
 *
 * `adjust` is applied to TDEE; `proteinPerKg` follows normal sports-nutrition
 * practice (higher protein when in a deficit or building tissue).
 */
const GOAL_RULES: Record<PrimaryGoal, { adjust: number; proteinPerKg: number }> = {
  LOSE_WEIGHT: { adjust: -500, proteinPerKg: 2.0 },
  GAIN_WEIGHT: { adjust: +500, proteinPerKg: 1.8 },
  BUILD_MUSCLE: { adjust: +300, proteinPerKg: 2.2 },
  // Recomposition sits at roughly maintenance with the highest protein.
  BODY_RECOMPOSITION: { adjust: -100, proteinPerKg: 2.4 },
  MAINTAIN_WEIGHT: { adjust: 0, proteinPerKg: 1.6 },
  IMPROVE_FITNESS: { adjust: +100, proteinPerKg: 1.8 },
  IMPROVE_NUTRITION: { adjust: 0, proteinPerKg: 1.6 },
  GENERAL_HEALTH: { adjust: 0, proteinPerKg: 1.6 },
};

export class InvalidProfileError extends Error {
  missingFields: string[];
  constructor(missingFields: string[]) {
    super(`Cannot calculate nutrition targets. Invalid or missing: ${missingFields.join(', ')}`);
    this.name = 'InvalidProfileError';
    this.missingFields = missingFields;
  }
}

function inRange(value: unknown, min: number, max: number): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

/**
 * Returns the list of fields that are missing or out of range. Empty means the
 * profile is complete enough to compute a real, personalized plan.
 */
export function validateCalculationInput(input: Partial<CalculationInput>): string[] {
  const missing: string[] = [];
  if (!inRange(input.age, LIMITS.age.min, LIMITS.age.max)) missing.push('age');
  if (input.biologicalSex !== 'male' && input.biologicalSex !== 'female') missing.push('biologicalSex');
  if (!inRange(input.heightCm, LIMITS.heightCm.min, LIMITS.heightCm.max)) missing.push('heightCm');
  if (!inRange(input.weightKg, LIMITS.weightKg.min, LIMITS.weightKg.max)) missing.push('weightKg');
  if (!input.activityLevel || !(input.activityLevel in ACTIVITY_MULTIPLIERS)) missing.push('activityLevel');
  if (!input.goal || !(input.goal in GOAL_RULES)) missing.push('goal');
  return missing;
}

/**
 * Converts a height the user may have entered in feet into centimetres.
 * Values that already look like centimetres are returned untouched.
 *
 * A bare "6" cannot be a height in cm, so it is read as 6 feet. This is the
 * specific data-entry mistake found in the existing user records.
 */
export function normalizeHeightToCm(value: number, unit?: 'cm' | 'ft'): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  if (unit === 'cm') return value;
  if (unit === 'ft') return Math.round(value * 30.48);
  // No unit given: infer. Feet are single digits, centimetres are three.
  if (value < 3) return null;
  if (value <= 8) return Math.round(value * 30.48);
  return value;
}

/**
 * Deterministic nutrition targets via Mifflin-St Jeor. Pure and independently
 * testable: same input always yields the same output, and no defaults are
 * substituted for missing data.
 *
 * @throws InvalidProfileError when the profile cannot support a real calculation.
 */
export function calculateNutritionTargets(input: CalculationInput): CalculationResult {
  const missing = validateCalculationInput(input);
  if (missing.length > 0) throw new InvalidProfileError(missing);

  const { age, biologicalSex, heightCm, weightKg, activityLevel, goal } = input;

  // Mifflin-St Jeor
  const bmr = Math.round(
    10 * weightKg + 6.25 * heightCm - 5 * age + (biologicalSex === 'female' ? -161 : 5),
  );

  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
  const rule = GOAL_RULES[goal];

  // Never prescribe an aggressive deficit: cap the cut at 25% below maintenance.
  const floorFromTdee = Math.round(tdee * 0.75);
  const absoluteFloor = biologicalSex === 'female' ? 1200 : 1500;
  const safeFloor = Math.max(floorFromTdee, absoluteFloor);

  const calories = Math.max(tdee + rule.adjust, safeFloor);

  const proteinGrams = Math.round(weightKg * rule.proteinPerKg);
  const fatGrams = Math.round((calories * 0.28) / 9);
  const carbsGrams = Math.max(
    0,
    Math.round((calories - proteinGrams * 4 - fatGrams * 9) / 4),
  );

  // 14g fibre per 1000 kcal, the commonly used dietary reference.
  const fiberGrams = Math.round((calories / 1000) * 14);
  const waterMl = Math.round(weightKg * 35);

  return {
    targets: { calories, proteinGrams, carbsGrams, fatGrams, fiberGrams, waterMl },
    basis: {
      bmr,
      tdee,
      goalAdjustment: calories - tdee,
      proteinGramsPerKg: rule.proteinPerKg,
    },
  };
}

/**
 * Maps free-text goal wording onto a supported goal. Used to interpret what the
 * user typed; it never overrides an explicit selection.
 */
export function interpretGoalText(text: string): PrimaryGoal | null {
  const t = text.toLowerCase();
  const mentionsMuscle = /\b(muscle|bulk|strength|gain muscle|lean mass)\b/.test(t);
  const mentionsFatLoss = /\b(lose fat|fat loss|cut|leaner|lose weight|slim)\b/.test(t);

  if (mentionsMuscle && mentionsFatLoss) return 'BODY_RECOMPOSITION';
  if (/\brecomp/.test(t)) return 'BODY_RECOMPOSITION';
  if (mentionsMuscle) return 'BUILD_MUSCLE';
  if (mentionsFatLoss) return 'LOSE_WEIGHT';
  if (/\b(maintain|stay the same|keep my weight)\b/.test(t)) return 'MAINTAIN_WEIGHT';
  if (/\b(gain weight|put on weight)\b/.test(t)) return 'GAIN_WEIGHT';
  if (/\b(fitter|fitness|endurance|stamina)\b/.test(t)) return 'IMPROVE_FITNESS';
  if (/\b(eat better|nutrition|healthier diet)\b/.test(t)) return 'IMPROVE_NUTRITION';
  return null;
}
