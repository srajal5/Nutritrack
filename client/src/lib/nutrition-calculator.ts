export interface UserProfileData {
  age: number;
  weightKg: number;
  heightCm: number;
  targetWeightKg?: number;
  gender?: string;
  activityLevel?: string;
  goal?: string;
}

/**
 * Calculates personalized nutrition targets using the Mifflin-St Jeor equation.
 * Goal IDs match the uppercase GOALS array from Onboarding.tsx (e.g. "LOSE_WEIGHT", "BUILD_MUSCLE").
 */
export function calculateNutritionTargets(profile: UserProfileData) {
  const {
    age = 30,
    weightKg = 70,
    heightCm = 170,
    gender = 'male',
    activityLevel = 'MODERATE',
    goal = 'MAINTAIN_WEIGHT'
  } = profile;

  // Mifflin-St Jeor Equation for BMR
  let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  if (gender.toLowerCase() === 'female') {
    bmr -= 161;
  } else {
    bmr += 5;
  }

  // Activity Multiplier — match uppercase IDs from Onboarding ACTIVITY_LEVELS
  let activityMultiplier = 1.55;
  const level = activityLevel.toUpperCase();
  switch (level) {
    case 'SEDENTARY': activityMultiplier = 1.2; break;
    case 'LIGHT': activityMultiplier = 1.375; break;
    case 'MODERATE': activityMultiplier = 1.55; break;
    case 'ACTIVE': activityMultiplier = 1.725; break;
    case 'VERY_ACTIVE': activityMultiplier = 1.9; break;
  }

  const tdee = Math.round(bmr * activityMultiplier);
  let calorieTarget = tdee;
  let proteinMultiplier = 1.6; // g per kg for maintenance

  // Adjust for goal — match uppercase IDs from Onboarding GOALS array
  const normalizedGoal = goal.toUpperCase();
  if (normalizedGoal === 'LOSE_WEIGHT') {
    calorieTarget = tdee - 500;
    proteinMultiplier = 2.0;
  } else if (normalizedGoal === 'BUILD_MUSCLE') {
    calorieTarget = tdee + 300;
    proteinMultiplier = 2.2;
  } else if (normalizedGoal === 'GAIN_WEIGHT') {
    calorieTarget = tdee + 500;
    proteinMultiplier = 1.8;
  } else if (normalizedGoal === 'IMPROVE_FITNESS' || normalizedGoal === 'IMPROVE_STRENGTH') {
    calorieTarget = tdee + 100;
    proteinMultiplier = 1.8;
  }
  // MAINTAIN_WEIGHT / IMPROVE_NUTRITION / GENERAL_HEALTH = tdee as-is

  // Ensure minimum safe calories
  const minCalories = gender.toLowerCase() === 'female' ? 1200 : 1500;
  calorieTarget = Math.max(calorieTarget, minCalories);

  // Calculate macros
  const proteinTarget = Math.round(weightKg * proteinMultiplier);
  const proteinCalories = proteinTarget * 4;

  const fatCalories = calorieTarget * 0.30;
  const fatTarget = Math.round(fatCalories / 9);

  const carbCalories = calorieTarget - proteinCalories - fatCalories;
  const carbTarget = Math.max(0, Math.round(carbCalories / 4));

  const waterTarget = Math.round(weightKg * 35); // 35ml per kg

  return {
    calorieTarget: Math.round(calorieTarget),
    proteinTarget,
    carbTarget,
    fatTarget,
    waterTarget
  };
}
