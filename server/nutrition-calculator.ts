export interface UserProfileData {
  age?: number;
  weightKg?: number;
  heightCm?: number;
  targetWeightKg?: number;
  gender?: string;
  activityLevel?: string;
  goal?: string;
}

/**
 * Calculates personalized nutrition targets on the backend using the Mifflin-St Jeor equation.
 * Matches client/src/lib/nutrition-calculator.ts for deterministic target calculation.
 */
export function calculateBackendNutritionTargets(profile: UserProfileData) {
  const age = Number(profile.age) || 30;
  const weightKg = Number(profile.weightKg) || 70;
  const heightCm = Number(profile.heightCm) || 170;
  const gender = (profile.gender || 'male').toLowerCase();
  const activityLevel = (profile.activityLevel || 'MODERATE').toUpperCase();
  const goal = (profile.goal || 'MAINTAIN_WEIGHT').toUpperCase();

  // Mifflin-St Jeor Equation for BMR
  let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  if (gender === 'female') {
    bmr -= 161;
  } else {
    bmr += 5;
  }

  // Activity Multiplier
  let activityMultiplier = 1.55;
  switch (activityLevel) {
    case 'SEDENTARY': activityMultiplier = 1.2; break;
    case 'LIGHT': activityMultiplier = 1.375; break;
    case 'MODERATE': activityMultiplier = 1.55; break;
    case 'ACTIVE': activityMultiplier = 1.725; break;
    case 'VERY_ACTIVE': activityMultiplier = 1.9; break;
  }

  const tdee = Math.round(bmr * activityMultiplier);
  let calorieTarget = tdee;
  let proteinMultiplier = 1.6; // g per kg for maintenance

  if (goal === 'LOSE_WEIGHT') {
    calorieTarget = tdee - 500;
    proteinMultiplier = 2.0;
  } else if (goal === 'BUILD_MUSCLE') {
    calorieTarget = tdee + 300;
    proteinMultiplier = 2.2;
  } else if (goal === 'GAIN_WEIGHT') {
    calorieTarget = tdee + 500;
    proteinMultiplier = 1.8;
  } else if (goal === 'IMPROVE_FITNESS' || goal === 'IMPROVE_STRENGTH') {
    calorieTarget = tdee + 100;
    proteinMultiplier = 1.8;
  }

  const minCalories = gender === 'female' ? 1200 : 1500;
  calorieTarget = Math.max(calorieTarget, minCalories);

  const proteinTarget = Math.round(weightKg * proteinMultiplier);
  const proteinCalories = proteinTarget * 4;

  const fatCalories = calorieTarget * 0.30;
  const fatTarget = Math.round(fatCalories / 9);

  const carbCalories = calorieTarget - proteinCalories - fatCalories;
  const carbTarget = Math.max(0, Math.round(carbCalories / 4));

  const waterTarget = Math.round(weightKg * 35); // 35ml per kg

  return {
    calorieTarget,
    proteinTarget,
    carbTarget,
    fatTarget,
    waterTarget
  };
}
