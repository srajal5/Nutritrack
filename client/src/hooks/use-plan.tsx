import { useQuery } from "@tanstack/react-query";
import { getQueryFn, queryClient } from "../lib/queryClient";
import { useAuth } from "./use-auth";
import type {
  AIInsight, DailyNutrition, DailyProgress, FoodSuggestion, Mission,
  PersonalizedPlan, PlanStatus, FoodEntrySummary,
} from "@shared/types";

export interface ProgressSummary {
  hasEnoughHistory: boolean;
  daysLogged: number;
  proteinConsistencyPct: number | null;
  calorieConsistencyPct: number | null;
  startWeightKg: number | null;
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  weightHistory: { weightKg: number; recordedAt: string }[];
}

export interface CanonicalDashboard {
  planStatus: PlanStatus;
  missingFields: string[];
  user: { id: number; displayName: string };
  plan: PersonalizedPlan | null;
  today: DailyNutrition;
  progress: DailyProgress | null;
  streakDays: number;
  missions: Mission[];
  recentMeals: FoodEntrySummary[];
  aiBrief: AIInsight | null;
  progressSummary: ProgressSummary | null;
  foodSuggestions: FoodSuggestion[];
}

/** The one query key every page shares, so a single invalidation refreshes all of them. */
export function dashboardKey(userId?: number) {
  return `/api/dashboard/${userId}`;
}

/**
 * THE canonical client-side source of truth for the user's plan and today's
 * numbers. Dashboard, Profile, Stats, Tracker and AI Coach all read this rather
 * than each assembling targets from unrelated endpoints — which is how Profile
 * and Dashboard previously ended up disagreeing.
 */
export function usePlan() {
  const { user } = useAuth();

  const query = useQuery<CanonicalDashboard>({
    queryKey: [dashboardKey(user?.id)],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user?.id,
    staleTime: 0,
  });

  const data = query.data;
  const plan = data?.plan ?? null;
  const today = data?.today ?? null;

  /** What is still left to eat/drink today. Never negative. */
  const remaining = plan && today
    ? {
        calories: Math.max(0, plan.targets.calories - today.calories),
        protein: Math.max(0, plan.targets.proteinGrams - today.protein),
        carbs: Math.max(0, plan.targets.carbsGrams - today.carbs),
        fat: Math.max(0, plan.targets.fatGrams - today.fat),
        waterMl: Math.max(0, plan.targets.waterMl - today.waterMl),
      }
    : null;

  return {
    ...query,
    data,
    plan,
    today,
    remaining,
    hasPlan: data?.planStatus === "ready" && !!plan,
    planStatus: data?.planStatus,
    missingFields: data?.missingFields ?? [],
  };
}

/**
 * Invalidate everything that depends on the plan or today's intake.
 * Called after onboarding, food logging, water logging and profile updates so
 * no page is left showing stale targets.
 */
export async function invalidatePlanData() {
  await Promise.all([
    queryClient.invalidateQueries({
      predicate: (q) => typeof q.queryKey[0] === "string" && q.queryKey[0].startsWith("/api/dashboard"),
    }),
    queryClient.invalidateQueries({ queryKey: ["/api/user-profile"] }),
    queryClient.invalidateQueries({ queryKey: ["/api/stats"] }),
    queryClient.invalidateQueries({
      predicate: (q) => typeof q.queryKey[0] === "string" && q.queryKey[0].startsWith("/api/food-entries"),
    }),
  ]);
}
