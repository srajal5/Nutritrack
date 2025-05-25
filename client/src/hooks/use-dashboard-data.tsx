import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "../lib/queryClient";
import { useAuth } from "./use-auth";

export interface DailySummary {
  totalCalories: number;
  protein: number;
  carbs: number;
  fat: number;
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
}

export interface DashboardData {
  dailySummary: DailySummary;
  weeklyProgress: WeeklyProgress[];
  recentEntries: RecentEntry[];
  nutritionGoals: NutritionGoals;
}

export function useDashboardData() {
  const { user } = useAuth();

  const { data: dailySummary, isLoading: isDailySummaryLoading } = useQuery<DailySummary>({
    queryKey: [`/api/food-entries/daily?userId=${user?.id}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user?.id
  });

  const { data: weeklyProgress, isLoading: isWeeklyProgressLoading } = useQuery<WeeklyProgress[]>({
    queryKey: [`/api/food-entries/weekly?userId=${user?.id}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user?.id
  });

  const { data: recentEntries, isLoading: isRecentEntriesLoading } = useQuery<RecentEntry[]>({
    queryKey: [`/api/food-entries/recent?userId=${user?.id}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user?.id
  });

  const { data: nutritionGoals, isLoading: isNutritionGoalsLoading } = useQuery<NutritionGoals>({
    queryKey: [`/api/nutrition-goals?userId=${user?.id}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user?.id
  });

  const isLoading = 
    isDailySummaryLoading || 
    isWeeklyProgressLoading || 
    isRecentEntriesLoading || 
    isNutritionGoalsLoading;

  return {
    dailySummary: dailySummary || {} as DailySummary,
    weeklyProgress: weeklyProgress || [] as WeeklyProgress[],
    recentEntries: recentEntries || [] as RecentEntry[],
    nutritionGoals: nutritionGoals || {} as NutritionGoals,
    isLoading
  };
} 