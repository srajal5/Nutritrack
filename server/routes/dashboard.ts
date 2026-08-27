import express from 'express';
import storage from '../storage.js';
import { ensureAuthenticated } from '../middleware.js';
import { readPlanFromProfile, findMissingProfileFields } from '../plan-service.js';
import { buildMissions, buildDailyBrief, buildProgressSummary, computeStreakDays } from '../dashboard-service.js';
import { buildFoodSuggestions } from '../food-suggestion-service.js';
import { enrichDailyBrief, enrichFoodSuggestions } from '../ai-enrichment.js';
import { getOrRefresh } from '../ai-cache.js';
import type { DashboardPayload, DailyNutrition } from '../../shared/types.js';

const router = express.Router();

/**
 * The single dashboard data source. Everything the page renders comes from
 * here, derived from the user's persisted plan.
 *
 * There are deliberately NO fallback targets. Previously this route computed
 * numbers for a fictional 30-year-old, 70kg, 170cm male whenever a profile was
 * incomplete, which is why unrelated users saw identical calories and protein.
 * When there is no plan the response says so and the UI shows a prompt.
 */
router.get('/:userId', ensureAuthenticated, async (req, res) => {
  try {
    const requestedUserId = Number(req.params.userId);
    const authenticatedUserId = req.user!.id;

    if (!Number.isFinite(requestedUserId) || requestedUserId !== authenticatedUserId) {
      return res.status(403).json({ message: 'Not authorized to view this dashboard' });
    }
    const userId = authenticatedUserId;

    let profile: any = await storage.getUserProfile(userId);
    if (profile && typeof profile.toObject === 'function') profile = profile.toObject();

    const plan = readPlanFromProfile(profile);
    const missingFields = findMissingProfileFields(profile);

    const today = new Date();
    const todaysEntries = await storage.getDailyFoodEntries(userId, today);

    const todayTotals: DailyNutrition = todaysEntries.reduce(
      (acc: DailyNutrition, e: any) => ({
        calories: acc.calories + (e.calories || 0),
        protein: acc.protein + (e.protein || 0),
        carbs: acc.carbs + (e.carbs || 0),
        fat: acc.fat + (e.fat || 0),
        fiber: acc.fiber + (e.fiber || 0),
        sugar: acc.sugar + (e.sugar || 0),
        waterMl: acc.waterMl + (e.waterMl || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, waterMl: 0 },
    );

    // Hydration is logged as an entry so it shares history and streak logic, but
    // it is not a meal and should not appear in the meals list as "0 kcal".
    const recentRaw = (await storage.getRecentFoodEntries(userId, 15))
      .filter((e: any) => (e.mealType || '').toLowerCase() !== 'water')
      .slice(0, 10);
    const recentMeals = recentRaw.map((e: any) => ({
      id: e.id,
      name: e.name,
      mealType: e.mealType || 'other',
      calories: e.calories || 0,
      protein: e.protein || 0,
      carbs: e.carbs || 0,
      fat: e.fat || 0,
      entryDate: new Date(e.entryDate || e.createdAt).toISOString(),
    }));

    const allEntries = await storage.getFoodEntriesByUserId(userId);
    const weightEntries = await storage.getWeightEntries(userId);
    const streakDays = computeStreakDays(allEntries as any[]);

    const displayName = resolveDisplayName(req.user);

    const payload: DashboardPayload = {
      planStatus: plan ? 'ready' : (profile ? 'incomplete_profile' : 'missing_profile'),
      missingFields: plan ? [] : missingFields,
      user: { id: userId, displayName },
      plan,
      today: todayTotals,
      progress: plan
        ? {
            caloriesPct: pct(todayTotals.calories, plan.targets.calories),
            proteinPct: pct(todayTotals.protein, plan.targets.proteinGrams),
            carbsPct: pct(todayTotals.carbs, plan.targets.carbsGrams),
            fatPct: pct(todayTotals.fat, plan.targets.fatGrams),
            waterPct: pct(todayTotals.waterMl, plan.targets.waterMl),
          }
        : null,
      streakDays,
      missions: plan ? buildMissions(plan, todayTotals, todaysEntries as any[]) : [],
      recentMeals,
      aiBrief: null,
    };

    // Deterministic first, AI second — and never awaited. The deterministic
    // brief ships immediately; enrichment warms the cache for the next request.
    if (plan) {
      const deterministicBrief = await buildDailyBrief(plan, todayTotals, profile);
      const briefKey = `brief:${userId}:${stateKey(plan, todayTotals)}`;
      payload.aiBrief = getOrRefresh(briefKey, deterministicBrief, () =>
        enrichDailyBrief(deterministicBrief, plan, todayTotals));
    }

    // Progress summary needs history; attach separately so a thin history
    // degrades to an honest empty state rather than invented statistics.
    (payload as any).progressSummary = plan
      ? buildProgressSummary(allEntries as any[], plan, profile, weightEntries as any[])
      : null;

    // Safety pipeline: hard allergy/diet/dislike filtering happens inside
    // buildFoodSuggestions BEFORE the model sees anything. The AI may only
    // reorder and re-word that already-safe list.
    if (plan) {
      const dietaryPreference = profile?.nutrition?.dietaryPreference || 'NO_RESTRICTION';
      const allergies = profile?.nutrition?.allergies || [];
      const preferredFoods = profile?.nutrition?.preferredFoods || [];
      const mealType = currentMealType();

      const safeCandidates = buildFoodSuggestions({
        plan,
        today: todayTotals,
        dietaryPreference,
        allergies,
        dislikedFoods: profile?.nutrition?.dislikedFoods || [],
        preferredFoods,
        mealType,
      });

      const remaining = {
        calories: Math.max(0, plan.targets.calories - todayTotals.calories),
        protein: Math.max(0, plan.targets.proteinGrams - todayTotals.protein),
        carbs: Math.max(0, plan.targets.carbsGrams - todayTotals.carbs),
        fat: Math.max(0, plan.targets.fatGrams - todayTotals.fat),
      };

      const sugKey = `sug:${userId}:${mealType}:${stateKey(plan, todayTotals)}`;
      (payload as any).foodSuggestions = getOrRefresh(sugKey, safeCandidates, () =>
        enrichFoodSuggestions(safeCandidates, plan, remaining,
          { dietaryPreference, allergies, preferredFoods, mealType }));
      (payload as any).remaining = remaining;
    } else {
      (payload as any).foodSuggestions = [];
      (payload as any).remaining = null;
    }

    res.setHeader('Cache-Control', 'no-store');
    res.json(payload);
  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
});

/**
 * Identity of the state the enrichment was produced for. Rounded to coarse
 * buckets so small changes reuse the cache, but any meaningful change misses it.
 */
function stateKey(plan: { targets: { calories: number; proteinGrams: number } }, today: DailyNutrition): string {
  return [
    plan.targets.calories,
    plan.targets.proteinGrams,
    Math.round(today.calories / 100),
    Math.round(today.protein / 10),
    Math.round(today.waterMl / 250),
  ].join('-');
}

/** Rough meal slot from the local hour, used to bias suggestions. */
function currentMealType(): string {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}

function pct(consumed: number, target: number): number {
  if (!target || target <= 0) return 0;
  return Math.round((consumed / target) * 100);
}

/**
 * A name a human would recognise. Falls back through the chain rather than
 * showing a raw login handle such as "Hello@1".
 */
function resolveDisplayName(user: any): string {
  const displayName = typeof user?.displayName === 'string' ? user.displayName.trim() : '';
  if (displayName) return displayName;

  const username = typeof user?.username === 'string' ? user.username.trim() : '';
  // Only use a username that reads like a name, not an email/handle.
  if (username && /^[A-Za-z][A-Za-z .'-]{1,30}$/.test(username)) return username;

  const email = typeof user?.email === 'string' ? user.email : '';
  const localPart = email.split('@')[0] || '';
  const cleaned = localPart.replace(/[._\d-]+/g, ' ').trim();
  if (cleaned && /^[A-Za-z][A-Za-z ]*$/.test(cleaned)) {
    return cleaned.replace(/\b\w/g, (c: string) => c.toUpperCase());
  }
  return 'there';
}

export default router;
