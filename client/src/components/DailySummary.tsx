import { useDashboardData } from "../hooks/use-dashboard-data";
import { Progress } from "./ui/progress";

export default function DailySummary() {
  const { dailySummary, nutritionGoals, isLoading } = useDashboardData();

  if (isLoading || !dailySummary || !nutritionGoals) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-1/3 bg-white/10 rounded animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
          <div className="h-4 w-2/3 bg-white/10 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const calorieProgress = (dailySummary.totalCalories / nutritionGoals.dailyCalories) * 100;
  const proteinProgress = (dailySummary.protein / nutritionGoals.protein) * 100;
  const carbsProgress = (dailySummary.carbs / nutritionGoals.carbs) * 100;
  const fatProgress = (dailySummary.fat / nutritionGoals.fat) * 100;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-white/70">Daily Calories</span>
          <span className="text-white font-medium">
            {dailySummary.totalCalories} / {nutritionGoals.dailyCalories} kcal
          </span>
        </div>
        <Progress value={calorieProgress} className="h-2" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-white/70">Protein</span>
            <span className="text-white font-medium">
              {dailySummary.protein}g
            </span>
          </div>
          <Progress value={proteinProgress} className="h-2" />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-white/70">Carbs</span>
            <span className="text-white font-medium">
              {dailySummary.carbs}g
            </span>
          </div>
          <Progress value={carbsProgress} className="h-2" />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-white/70">Fat</span>
            <span className="text-white font-medium">
              {dailySummary.fat}g
            </span>
          </div>
          <Progress value={fatProgress} className="h-2" />
        </div>
      </div>

      <div className="pt-4 border-t border-white/10">
        <div className="flex justify-between items-center">
          <span className="text-white/70">Remaining Calories</span>
          <span className={`font-medium ${dailySummary.remainingCalories > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {dailySummary.remainingCalories} kcal
          </span>
        </div>
      </div>
    </div>
  );
}
