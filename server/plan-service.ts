import { z } from 'zod';
import storage from './storage.js';
import {
  calculateNutritionTargets,
  validateCalculationInput,
  normalizeHeightToCm,
  interpretGoalText,
  type CalculationInput,
} from './nutrition-calculator.js';
import { generatePersonalizedPlan } from './openai.js';
import {
  ACTIVITY_LEVELS,
  BIOLOGICAL_SEXES,
  DIETARY_PREFERENCES,
  FITNESS_LEVELS,
  PRIMARY_GOALS,
  WORKOUT_LOCATIONS,
  type PersonalizedPlan,
  type PrimaryGoal,
} from '../shared/types.js';

export const PLAN_VERSION = 2;

/**
 * Hard ceiling on the optional AI narrative during onboarding.
 *
 * The numeric plan is already complete before this call is made, so the model
 * is pure enhancement. Without a timeout a slow provider leaves the user
 * staring at "Building your plan…" indefinitely — which is exactly what a
 * browser run of the onboarding flow reproduced.
 */
const AI_PLAN_TIMEOUT_MS = 12000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('AI plan narrative timed out')), ms)),
  ]);
}

/**
 * Onboarding payload contract. Note the absence of `.default()` on any field
 * that feeds the calorie calculation — supplying a default there is exactly how
 * every user ended up with the same plan. Missing values must fail loudly.
 */
export const onboardingSchema = z.object({
  profile: z.object({
    age: z.number().int().min(13).max(100),
    biologicalSex: z.enum(BIOLOGICAL_SEXES),
    height: z.number().positive(),
    heightUnit: z.enum(['cm', 'ft']).optional(),
    weightKg: z.number().min(30).max(300),
    targetWeightKg: z.number().min(30).max(300).optional(),
    activityLevel: z.enum(ACTIVITY_LEVELS),
    fitnessLevel: z.enum(FITNESS_LEVELS),
  }),
  goal: z.object({
    primaryGoal: z.enum(PRIMARY_GOALS),
    goalDescription: z.string().max(1000).optional(),
    targetTimelineWeeks: z.number().int().positive().max(260).optional(),
  }),
  workout: z.object({
    daysPerWeek: z.number().int().min(0).max(7),
    location: z.enum(WORKOUT_LOCATIONS),
    equipment: z.array(z.string()).max(30),
  }),
  nutrition: z.object({
    dietaryPreference: z.enum(DIETARY_PREFERENCES),
    allergies: z.array(z.string()).max(30),
    dislikedFoods: z.array(z.string()).max(50),
    preferredFoods: z.array(z.string()).max(50),
    mealsPerDay: z.number().int().min(1).max(8),
  }),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

/** Diets that exclude particular foods, used to constrain AI suggestions. */
export const DIET_EXCLUSIONS: Record<string, string[]> = {
  VEGETARIAN: ['meat', 'poultry', 'chicken', 'beef', 'pork', 'fish', 'seafood', 'gelatin'],
  VEGAN: ['meat', 'poultry', 'chicken', 'beef', 'pork', 'fish', 'seafood', 'dairy', 'milk', 'cheese', 'yogurt', 'egg', 'eggs', 'honey', 'gelatin', 'whey', 'paneer'],
  EGGETARIAN: ['meat', 'poultry', 'chicken', 'beef', 'pork', 'fish', 'seafood', 'gelatin'],
  PESCATARIAN: ['meat', 'poultry', 'chicken', 'beef', 'pork'],
  HALAL: ['pork', 'bacon', 'ham', 'lard', 'alcohol'],
  KOSHER: ['pork', 'shellfish', 'bacon', 'ham'],
  NO_RESTRICTION: [],
};

export class PlanValidationError extends Error {
  missingFields: string[];
  constructor(message: string, missingFields: string[]) {
    super(message);
    this.name = 'PlanValidationError';
    this.missingFields = missingFields;
  }
}

/**
 * Resolves the user's goal. An explicit selection always wins; free text is
 * only consulted to refine it. The AI is never allowed to substitute a
 * different goal than the one the user asked for.
 */
export function resolveGoal(selected: PrimaryGoal, description?: string): PrimaryGoal {
  if (!description) return selected;
  const interpreted = interpretGoalText(description);
  if (!interpreted) return selected;

  // Only upgrade to recomposition, which users routinely express in words
  // ("gain muscle and lose fat") but cannot pick from a single-choice list.
  if (interpreted === 'BODY_RECOMPOSITION' && (selected === 'BUILD_MUSCLE' || selected === 'LOSE_WEIGHT')) {
    return 'BODY_RECOMPOSITION';
  }
  return selected;
}

/**
 * Builds the personalized plan: deterministic numbers first, AI narrative
 * second. If the AI fails or returns something unusable the plan is still
 * produced — the model is an enhancement, never a dependency.
 */
export async function buildPlan(input: OnboardingInput): Promise<PersonalizedPlan> {
  const heightCm = normalizeHeightToCm(input.profile.height, input.profile.heightUnit);
  if (heightCm === null) {
    throw new PlanValidationError('Height could not be interpreted.', ['height']);
  }

  const goal = resolveGoal(input.goal.primaryGoal, input.goal.goalDescription);

  const calcInput: CalculationInput = {
    age: input.profile.age,
    biologicalSex: input.profile.biologicalSex,
    heightCm,
    weightKg: input.profile.weightKg,
    activityLevel: input.profile.activityLevel,
    goal,
  };

  const missing = validateCalculationInput(calcInput);
  if (missing.length > 0) {
    throw new PlanValidationError(
      `To create an accurate personalized plan, please provide: ${missing.join(', ')}.`,
      missing,
    );
  }

  const { targets, basis } = calculateNutritionTargets(calcInput);

  const plan: PersonalizedPlan = {
    planVersion: PLAN_VERSION,
    generatedAt: new Date().toISOString(),
    goal: {
      primaryGoal: goal,
      goalDescription: input.goal.goalDescription,
      targetWeightKg: input.profile.targetWeightKg,
      targetTimelineWeeks: input.goal.targetTimelineWeeks,
    },
    targets,
    basis,
    focusAreas: deriveFocusAreas(goal),
    weeklyWorkoutPlan: [],
    nutritionGuidelines: [],
  };

  // AI narrative layer. Numbers computed above are authoritative and are NOT
  // replaced by anything the model returns.
  try {
    const ai = await withTimeout(
      generatePersonalizedPlan(
        buildPlanPrompt(input, goal, targets, heightCm),
        { ...input.profile, heightCm, goal },
      ),
      AI_PLAN_TIMEOUT_MS,
    );
    if (ai && typeof ai === 'object') {
      const summary = (ai as any).summary ?? (ai as any).planSummary;
      if (typeof summary === 'string' && summary.trim()) plan.aiSummary = summary.trim();

      const workout = (ai as any).weeklyWorkoutPlan ?? (ai as any).workoutGuidance;
      if (Array.isArray(workout)) {
        plan.weeklyWorkoutPlan = workout.filter((x: unknown) => typeof x === 'string').slice(0, 14);
      }
      const guidelines = (ai as any).nutritionGuidelines ?? (ai as any).recommendations;
      if (Array.isArray(guidelines)) {
        plan.nutritionGuidelines = guidelines.filter((x: unknown) => typeof x === 'string').slice(0, 14);
      }
    }
  } catch (err) {
    console.warn('[plan-service] AI plan narrative unavailable, continuing with deterministic plan:', err);
  }

  return plan;
}

/** Goal-specific priorities that drive dashboard content and missions. */
export function deriveFocusAreas(goal: PrimaryGoal): string[] {
  switch (goal) {
    case 'LOSE_WEIGHT':
      return ['calorie deficit', 'protein', 'hydration', 'daily activity'];
    case 'BUILD_MUSCLE':
      return ['protein', 'calorie surplus', 'strength training', 'hydration'];
    case 'BODY_RECOMPOSITION':
      return ['protein', 'strength training', 'weight trend', 'hydration'];
    case 'GAIN_WEIGHT':
      return ['calorie surplus', 'meal frequency', 'strength training', 'hydration'];
    case 'IMPROVE_FITNESS':
      return ['training consistency', 'carbohydrates', 'hydration', 'recovery'];
    case 'IMPROVE_NUTRITION':
      return ['food quality', 'fibre', 'protein', 'hydration'];
    case 'MAINTAIN_WEIGHT':
    case 'GENERAL_HEALTH':
    default:
      return ['weight stability', 'balanced nutrition', 'activity', 'hydration'];
  }
}

function buildPlanPrompt(
  input: OnboardingInput,
  goal: PrimaryGoal,
  targets: PersonalizedPlan['targets'],
  heightCm: number,
): string {
  const { profile, workout, nutrition } = input;
  return [
    'Write a personalized nutrition and training plan narrative.',
    '',
    'USER PROFILE',
    `- Age: ${profile.age}, biological sex: ${profile.biologicalSex}`,
    `- Height: ${heightCm} cm, weight: ${profile.weightKg} kg`,
    profile.targetWeightKg ? `- Target weight: ${profile.targetWeightKg} kg` : '',
    `- Activity level: ${profile.activityLevel}, fitness level: ${profile.fitnessLevel}`,
    '',
    'GOAL',
    `- Primary goal: ${goal}`,
    input.goal.goalDescription ? `- In the user's words: "${input.goal.goalDescription}"` : '',
    '',
    'TRAINING',
    `- ${workout.daysPerWeek} days/week at ${workout.location}`,
    `- Equipment: ${workout.equipment.length ? workout.equipment.join(', ') : 'none specified'}`,
    '',
    'DIET',
    `- Preference: ${nutrition.dietaryPreference}`,
    `- Allergies: ${nutrition.allergies.length ? nutrition.allergies.join(', ') : 'none'}`,
    `- Dislikes: ${nutrition.dislikedFoods.length ? nutrition.dislikedFoods.join(', ') : 'none'}`,
    `- Prefers: ${nutrition.preferredFoods.length ? nutrition.preferredFoods.join(', ') : 'none'}`,
    `- Meals per day: ${nutrition.mealsPerDay}`,
    '',
    'ALREADY-CALCULATED DAILY TARGETS (authoritative — do not change these numbers)',
    `- ${targets.calories} kcal, ${targets.proteinGrams}g protein, ${targets.carbsGrams}g carbs, ${targets.fatGrams}g fat, ${targets.waterMl}ml water`,
    '',
    'RULES',
    '- Never invent profile information that was not provided.',
    '- Never recommend anything the user is allergic to.',
    '- Never contradict the stated dietary preference.',
    '- Never replace the primary goal with a different one.',
    '- Return JSON with keys: summary (string), weeklyWorkoutPlan (string[]), nutritionGuidelines (string[]).',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Persists profile and plan together, then marks onboarding complete.
 * The caller must not redirect until this resolves.
 */
export async function saveProfileAndPlan(userId: number, input: OnboardingInput, plan: PersonalizedPlan) {
  const heightCm = normalizeHeightToCm(input.profile.height, input.profile.heightUnit)!;

  const profileDoc = {
    isCompleted: true,
    profile: {
      age: input.profile.age,
      gender: input.profile.biologicalSex,
      biologicalSex: input.profile.biologicalSex,
      heightCm,
      weightKg: input.profile.weightKg,
      targetWeightKg: input.profile.targetWeightKg,
      activityLevel: input.profile.activityLevel,
      fitnessLevel: input.profile.fitnessLevel,
    },
    goal: {
      primaryGoal: plan.goal.primaryGoal,
      goalDescription: input.goal.goalDescription,
      desiredOutcome: input.goal.goalDescription,
      targetTimelineWeeks: input.goal.targetTimelineWeeks,
      secondaryGoals: [],
    },
    workout: {
      daysPerWeek: input.workout.daysPerWeek,
      location: input.workout.location,
      equipment: input.workout.equipment,
    },
    nutrition: {
      dietaryPreference: input.nutrition.dietaryPreference,
      allergies: input.nutrition.allergies,
      dislikedFoods: input.nutrition.dislikedFoods,
      preferredFoods: input.nutrition.preferredFoods,
      mealsPerDay: input.nutrition.mealsPerDay,
      calorieTarget: plan.targets.calories,
      proteinTarget: plan.targets.proteinGrams,
    },
    plan: {
      planVersion: plan.planVersion,
      generatedAt: new Date(plan.generatedAt),
      targets: plan.targets,
      basis: plan.basis,
      aiSummary: plan.aiSummary,
      focusAreas: plan.focusAreas,
      weeklyWorkoutPlan: plan.weeklyWorkoutPlan,
      nutritionGuidelines: plan.nutritionGuidelines,
    },
    // Legacy mirror so any older reader keeps working.
    aiPlan: {
      summary: plan.aiSummary || 'Personalized Nutrition & Training Plan',
      weeklyWorkoutPlan: plan.weeklyWorkoutPlan,
      nutritionGuidelines: plan.nutritionGuidelines,
      dailyTargets: {
        calories: plan.targets.calories,
        protein: plan.targets.proteinGrams,
        carbs: plan.targets.carbsGrams,
        fat: plan.targets.fatGrams,
        water: plan.targets.waterMl,
      },
    },
  };

  const saved = await storage.updateUserProfile(userId, profileDoc as any);

  // Keep the fast-query goals collection in lockstep with the plan. It is a
  // projection of the plan, never an independent source of targets.
  await storage.setNutritionGoal({
    userId,
    calorieGoal: plan.targets.calories,
    proteinGoal: plan.targets.proteinGrams,
    carbGoal: plan.targets.carbsGrams,
    fatGoal: plan.targets.fatGrams,
    fiberGoal: plan.targets.fiberGrams,
    sugarGoal: 50,
  } as any);

  return saved;
}

/**
 * Reads the persisted plan back out of a profile document. Returns null when
 * the user has no usable plan — callers must show an empty state rather than
 * substituting default numbers.
 */
export function readPlanFromProfile(profile: any): PersonalizedPlan | null {
  const p = profile?.plan;
  const t = p?.targets;
  if (!t || !t.calories || !t.proteinGrams) return null;

  return {
    planVersion: p.planVersion ?? 1,
    generatedAt: p.generatedAt ? new Date(p.generatedAt).toISOString() : new Date(0).toISOString(),
    goal: {
      primaryGoal: (profile.goal?.primaryGoal as PrimaryGoal) || 'GENERAL_HEALTH',
      goalDescription: profile.goal?.goalDescription || profile.goal?.desiredOutcome || undefined,
      targetWeightKg: profile.profile?.targetWeightKg,
      targetTimelineWeeks: profile.goal?.targetTimelineWeeks,
    },
    targets: {
      calories: t.calories,
      proteinGrams: t.proteinGrams,
      carbsGrams: t.carbsGrams ?? 0,
      fatGrams: t.fatGrams ?? 0,
      fiberGrams: t.fiberGrams ?? 0,
      waterMl: t.waterMl ?? 0,
    },
    basis: {
      bmr: p.basis?.bmr ?? 0,
      tdee: p.basis?.tdee ?? 0,
      goalAdjustment: p.basis?.goalAdjustment ?? 0,
      proteinGramsPerKg: p.basis?.proteinGramsPerKg ?? 0,
    },
    aiSummary: p.aiSummary,
    focusAreas: Array.isArray(p.focusAreas) && p.focusAreas.length
      ? p.focusAreas
      : deriveFocusAreas((profile.goal?.primaryGoal as PrimaryGoal) || 'GENERAL_HEALTH'),
    weeklyWorkoutPlan: p.weeklyWorkoutPlan ?? [],
    nutritionGuidelines: p.nutritionGuidelines ?? [],
  };
}

/**
 * Which required fields a stored profile is still missing. Drives the
 * "finish your plan" prompt instead of silently fabricating targets.
 */
export function findMissingProfileFields(profile: any): string[] {
  if (!profile) return ['profile'];
  const sex = profile.profile?.biologicalSex ?? profile.profile?.gender;
  return validateCalculationInput({
    age: profile.profile?.age,
    biologicalSex: sex === 'male' || sex === 'female' ? sex : undefined,
    heightCm: profile.profile?.heightCm,
    weightKg: profile.profile?.weightKg,
    activityLevel: profile.profile?.activityLevel,
    goal: profile.goal?.primaryGoal,
  });
}
