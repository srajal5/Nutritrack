import type {
  AIInsight,
  DailyNutrition,
  Mission,
  PersonalizedPlan,
  PrimaryGoal,
} from '../shared/types.js';

interface EntryLike {
  entryDate?: Date | string;
  createdAt?: Date | string;
  mealType?: string;
  calories?: number;
  protein?: number;
}

function dayKey(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10);
}

/**
 * Consecutive days, ending today or yesterday, on which the user logged at
 * least one entry. Derived from real entries — never a placeholder number.
 */
export function computeStreakDays(entries: EntryLike[]): number {
  if (!entries?.length) return 0;

  const days = new Set(entries.map((e) => dayKey(e.entryDate || e.createdAt || new Date())));

  const today = new Date();
  const todayKey = dayKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  // A streak stays alive until the end of the following day, so today having
  // no entry yet does not wipe out yesterday's run.
  let cursor = new Date(today);
  if (!days.has(todayKey)) {
    if (!days.has(dayKey(yesterday))) return 0;
    cursor = yesterday;
  }

  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

/**
 * Missions are generated from the user's goal, so a weight-loss user and a
 * muscle-gain user genuinely see different tasks rather than relabelled ones.
 */
export function buildMissions(
  plan: PersonalizedPlan,
  today: DailyNutrition,
  entries: EntryLike[],
): Mission[] {
  const goal = plan.goal.primaryGoal;
  const t = plan.targets;
  const loggedMeals = entries.filter((e) => MEAL_TYPES.includes((e.mealType || '').toLowerCase()));
  const missions: Mission[] = [];

  missions.push({
    id: 'log-meals',
    label: loggedMeals.length ? `Log your meals (${loggedMeals.length} so far)` : 'Log your first meal',
    completed: loggedMeals.length >= 2,
    rationale: 'Consistent logging is what makes every other number here accurate.',
  });

  missions.push({
    id: 'protein',
    label: `Hit ${t.proteinGrams}g protein`,
    completed: today.protein >= t.proteinGrams * 0.9,
    rationale: proteinRationale(goal),
  });

  if (goal === 'LOSE_WEIGHT' || goal === 'BODY_RECOMPOSITION') {
    missions.push({
      id: 'calorie-ceiling',
      label: `Stay within ${t.calories} kcal`,
      completed: today.calories > 0 && today.calories <= t.calories,
      rationale: 'A controlled deficit is what drives fat loss.',
    });
  } else if (goal === 'BUILD_MUSCLE' || goal === 'GAIN_WEIGHT') {
    missions.push({
      id: 'calorie-floor',
      label: `Reach ${t.calories} kcal`,
      completed: today.calories >= t.calories * 0.95,
      rationale: 'Tissue cannot be built without an energy surplus.',
    });
  } else {
    missions.push({
      id: 'calorie-band',
      label: `Stay near ${t.calories} kcal`,
      completed: today.calories >= t.calories * 0.9 && today.calories <= t.calories * 1.1,
      rationale: 'Keeping intake near maintenance holds your weight steady.',
    });
  }

  const waterRemaining = Math.max(0, t.waterMl - today.waterMl);
  missions.push({
    id: 'hydration',
    label: waterRemaining > 0 ? `Drink ${formatLitres(waterRemaining)} more water` : 'Hydration target reached',
    completed: waterRemaining === 0,
    rationale: 'Hydration affects appetite, training quality and recovery.',
  });

  return missions;
}

function proteinRationale(goal: PrimaryGoal): string {
  switch (goal) {
    case 'LOSE_WEIGHT':
      return 'Protein preserves muscle while you are in a deficit.';
    case 'BUILD_MUSCLE':
    case 'GAIN_WEIGHT':
      return 'Protein is the raw material for new muscle.';
    case 'BODY_RECOMPOSITION':
      return 'High protein is what lets you add muscle and lose fat at once.';
    default:
      return 'Protein keeps you full and supports recovery.';
  }
}

function formatLitres(ml: number): string {
  return `${(ml / 1000).toFixed(1)}L`;
}

/**
 * The daily brief. Deterministic by design: it reads the user's real numbers
 * and says something true about them. The AI layer may enrich this later, but
 * the dashboard never depends on the model being reachable.
 */
export async function buildDailyBrief(
  plan: PersonalizedPlan,
  today: DailyNutrition,
  _profile: unknown,
): Promise<AIInsight> {
  const t = plan.targets;
  const goal = plan.goal.primaryGoal;

  const proteinShort = Math.max(0, t.proteinGrams - today.protein);
  const calorieDiff = t.calories - today.calories;
  const waterShort = Math.max(0, t.waterMl - today.waterMl);

  let headline: string;
  let body: string;

  if (today.calories === 0) {
    headline = 'Nothing logged yet today.';
    body = `Your plan calls for ${t.calories} kcal and ${t.proteinGrams}g protein. Log your first meal to start tracking.`;
  } else if (proteinShort > t.proteinGrams * 0.25) {
    headline = `You're ${Math.round(proteinShort)}g short of your protein target.`;
    body = goal === 'LOSE_WEIGHT'
      ? 'Protein keeps you full and protects muscle in a deficit — make it the centre of your next meal.'
      : 'A protein-rich snack or a larger portion at your next meal would close the gap.';
  } else if (goal === 'LOSE_WEIGHT' && calorieDiff < 0) {
    headline = `You're ${Math.abs(calorieDiff)} kcal over today's target.`;
    body = 'Keep the next meal lighter and protein-forward to stay close to your deficit.';
  } else if ((goal === 'BUILD_MUSCLE' || goal === 'GAIN_WEIGHT') && calorieDiff > t.calories * 0.2) {
    headline = `You still have ${calorieDiff} kcal to eat today.`;
    body = 'Falling short of a surplus is the most common reason muscle gain stalls. Add a calorie-dense meal.';
  } else if (waterShort > t.waterMl * 0.3) {
    headline = `Hydration is behind — ${formatLitres(waterShort)} to go.`;
    body = `You've reached ${formatLitres(today.waterMl)} of your ${formatLitres(t.waterMl)} target.`;
  } else {
    headline = "You're on track today.";
    body = `${Math.round(today.calories)} of ${t.calories} kcal and ${Math.round(today.protein)}g of ${t.proteinGrams}g protein. Keep it steady.`;
  }

  return { headline, body, focusAreas: plan.focusAreas, isFallback: true };
}

export interface WeightPoint {
  weightKg: number;
  recordedAt: string;
}

export interface ProgressSummary {
  hasEnoughHistory: boolean;
  daysLogged: number;
  proteinConsistencyPct: number | null;
  calorieConsistencyPct: number | null;
  startWeightKg: number | null;
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  /** Real recorded measurements only. Empty means "no trend to show yet". */
  weightHistory: WeightPoint[];
}

/**
 * Seven-day consistency, computed from actual entries. When there is not
 * enough history it says so instead of inventing statistics.
 */
export function buildProgressSummary(
  entries: EntryLike[],
  plan: PersonalizedPlan,
  profile: any,
  weightEntries: { weightKg: number; recordedAt: Date | string }[] = [],
): ProgressSummary {
  // Oldest-first for display; these are actual measurements, never interpolated.
  const weightHistory: WeightPoint[] = [...weightEntries]
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
    .map((w) => ({ weightKg: w.weightKg, recordedAt: new Date(w.recordedAt).toISOString() }));
  const earliestWeight = weightHistory.length ? weightHistory[0].weightKg : null;
  const latestWeight = weightHistory.length ? weightHistory[weightHistory.length - 1].weightKg : null;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  const byDay = new Map<string, { calories: number; protein: number }>();
  for (const e of entries) {
    const when = new Date(e.entryDate || e.createdAt || 0);
    if (when < cutoff) continue;
    const key = dayKey(when);
    const acc = byDay.get(key) || { calories: 0, protein: 0 };
    acc.calories += e.calories || 0;
    acc.protein += e.protein || 0;
    byDay.set(key, acc);
  }

  const days = [...byDay.values()];
  const daysLogged = days.length;

  if (daysLogged < 2) {
    return {
      hasEnoughHistory: false,
      daysLogged,
      proteinConsistencyPct: null,
      calorieConsistencyPct: null,
      startWeightKg: earliestWeight,
      currentWeightKg: latestWeight ?? profile?.profile?.weightKg ?? null,
      targetWeightKg: profile?.profile?.targetWeightKg ?? null,
      weightHistory,
    };
  }

  const avg = (pick: (d: { calories: number; protein: number }) => number) =>
    days.reduce((s, d) => s + pick(d), 0) / daysLogged;

  const clampPct = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

  return {
    hasEnoughHistory: true,
    daysLogged,
    proteinConsistencyPct: clampPct((avg((d) => d.protein) / plan.targets.proteinGrams) * 100),
    calorieConsistencyPct: clampPct((avg((d) => d.calories) / plan.targets.calories) * 100),
    startWeightKg: earliestWeight,
    currentWeightKg: latestWeight ?? profile?.profile?.weightKg ?? null,
    targetWeightKg: profile?.profile?.targetWeightKg ?? null,
    weightHistory,
  };
}
