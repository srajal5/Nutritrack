import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "../lib/queryClient";
import { useAuth } from "./use-auth";
import { usePlan } from "./use-plan";

export interface DailySummary {
  totalCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  remainingCalories: number;
}

export interface WeeklyProgress {
  date: string;
  calories: number;
}

export interface RecentEntry {
  id: string;
  name: string;
  calories: number;
  timestamp: string;
}

export interface NutritionGoals {
  dailyCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiberGoal: number;
  sugarGoal: number;
}

export interface DashboardData {
  dailySummary: DailySummary;
  weeklyProgress: WeeklyProgress[];
  recentEntries: RecentEntry[];
  nutritionGoals: NutritionGoals;
  hasPlan: boolean;
  isLoading: boolean;
}

/**
 * Adapter kept for DailySummary, RecentFoodEntries and WeeklyCaloriesChart.
 *
 * The shape they consume is unchanged, but the numbers now come from the same
 * canonical dashboard payload as every other page. Previously this hook fetched
 * `/api/nutrition-goals` independently, which was a second source of truth and
 * returned invented defaults when a user had no plan.
 */
export function useDashboardData(): DashboardData {
  const { user } = useAuth();
  const { data: canonical, isLoading: isPlanLoading, plan, today, hasPlan } = usePlan();

  const { data: weeklyProgress, isLoading: isWeeklyLoading } = useQuery<WeeklyProgress[]>({
    queryKey: [`/api/food-entries/weekly`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user?.id,
  });

  const dailySummary: DailySummary = today
    ? {
        totalCalories: Math.round(today.calories),
        protein: Math.round(today.protein),
        carbs: Math.round(today.carbs),
        fat: Math.round(today.fat),
        fiber: Math.round(today.fiber),
        sugar: Math.round(today.sugar),
        // 0 only when a real target exists and is already met.
        remainingCalories: plan ? Math.max(0, plan.targets.calories - Math.round(today.calories)) : 0,
      }
    : { totalCalories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, remainingCalories: 0 };

  const nutritionGoals: NutritionGoals = plan
    ? {
        dailyCalories: plan.targets.calories,
        protein: plan.targets.proteinGrams,
        carbs: plan.targets.carbsGrams,
        fat: plan.targets.fatGrams,
        fiberGoal: plan.targets.fiberGrams,
        sugarGoal: 50,
      }
    // Zeros here mean "no plan", and consumers gate on hasPlan before rendering.
    : { dailyCalories: 0, protein: 0, carbs: 0, fat: 0, fiberGoal: 0, sugarGoal: 0 };

  const recentEntries: RecentEntry[] = (canonical?.recentMeals ?? []).map((m) => ({
    id: String(m.id),
    name: m.name,
    calories: m.calories,
    timestamp: m.entryDate,
  }));

  return {
    dailySummary,
    weeklyProgress: weeklyProgress ?? [],
    recentEntries,
    nutritionGoals,
    hasPlan,
    isLoading: isPlanLoading || isWeeklyLoading,
  };
}
