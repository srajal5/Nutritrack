/**
 * Single source of truth for user personalization.
 *
 * The chain is: auth user -> profile -> onboarding -> personalized plan ->
 * daily targets -> dashboard. Every consumer reads the SAME persisted plan;
 * nothing downstream is allowed to invent targets of its own.
 */

export const PRIMARY_GOALS = [
  'LOSE_WEIGHT',
  'GAIN_WEIGHT',
  'BUILD_MUSCLE',
  'BODY_RECOMPOSITION',
  'MAINTAIN_WEIGHT',
  'IMPROVE_FITNESS',
  'IMPROVE_NUTRITION',
  'GENERAL_HEALTH',
] as const;
export type PrimaryGoal = (typeof PRIMARY_GOALS)[number];

export const ACTIVITY_LEVELS = ['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE'] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const BIOLOGICAL_SEXES = ['male', 'female'] as const;
export type BiologicalSex = (typeof BIOLOGICAL_SEXES)[number];

export const FITNESS_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
export type FitnessLevel = (typeof FITNESS_LEVELS)[number];

export const DIETARY_PREFERENCES = [
  'NO_RESTRICTION',
  'VEGETARIAN',
  'VEGAN',
  'EGGETARIAN',
  'PESCATARIAN',
  'HALAL',
  'KOSHER',
] as const;
export type DietaryPreference = (typeof DIETARY_PREFERENCES)[number];

export const WORKOUT_LOCATIONS = ['HOME', 'GYM', 'OUTDOOR', 'MIXED'] as const;
export type WorkoutLocation = (typeof WORKOUT_LOCATIONS)[number];

/** Physical stats. Every field is required — a plan cannot be computed without them. */
export interface ProfileStats {
  age: number;
  biologicalSex: BiologicalSex;
  heightCm: number;
  weightKg: number;
  targetWeightKg?: number;
  activityLevel: ActivityLevel;
  fitnessLevel: FitnessLevel;
}

export interface GoalInfo {
  primaryGoal: PrimaryGoal;
  /** The user's own words, kept verbatim. The AI interprets it but must never replace it. */
  goalDescription?: string;
  targetWeightKg?: number;
  targetTimelineWeeks?: number;
}

export interface WorkoutInfo {
  daysPerWeek: number;
  location: WorkoutLocation;
  equipment: string[];
}

export interface DietInfo {
  dietaryPreference: DietaryPreference;
  allergies: string[];
  dislikedFoods: string[];
  preferredFoods: string[];
  mealsPerDay: number;
}

/** The computed daily targets the dashboard renders. Always deterministic. */
export interface DailyTargets {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  waterMl: number;
}

/** Intermediate values, surfaced so the numbers are explainable rather than magic. */
export interface CalculationBasis {
  bmr: number;
  tdee: number;
  goalAdjustment: number;
  proteinGramsPerKg: number;
}

export interface PersonalizedPlan {
  planVersion: number;
  generatedAt: string;
  goal: GoalInfo;
  targets: DailyTargets;
  basis: CalculationBasis;
  /** AI-authored narrative. Absent when the AI was unavailable — never fatal. */
  aiSummary?: string;
  focusAreas: string[];
  weeklyWorkoutPlan: string[];
  nutritionGuidelines: string[];
}

export interface DailyNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  waterMl: number;
}

export interface FoodEntrySummary {
  id: number;
  name: string;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  entryDate: string;
}

export interface Mission {
  id: string;
  label: string;
  completed: boolean;
  /** Why this mission exists for THIS user's goal. */
  rationale: string;
}

export interface FoodSuggestion {
  name: string;
  reason: string;
  estimatedCalories: number;
  estimatedProteinGrams: number;
  estimatedCarbsGrams: number;
  estimatedFatGrams: number;
  /** AI-estimated values are never presented as verified nutrition data. */
  isEstimate: boolean;
}

export interface AIInsight {
  headline: string;
  body: string;
  focusAreas: string[];
  /** True when produced by deterministic fallback rather than the model. */
  isFallback: boolean;
}

export interface DailyProgress {
  caloriesPct: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  waterPct: number;
}

/** Why a dashboard has no plan to show — drives the empty state, never fake numbers. */
export type PlanStatus = 'ready' | 'missing_profile' | 'incomplete_profile';

export interface DashboardPayload {
  planStatus: PlanStatus;
  /** Which required fields are absent, when planStatus is incomplete_profile. */
  missingFields: string[];
  user: { id: number; displayName: string };
  plan: PersonalizedPlan | null;
  today: DailyNutrition;
  progress: DailyProgress | null;
  streakDays: number;
  missions: Mission[];
  recentMeals: FoodEntrySummary[];
  aiBrief: AIInsight | null;
}
