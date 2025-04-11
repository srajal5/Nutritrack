import { useQuery } from '@tanstack/react-query';
import { Progress } from '@/components/ui/progress';

const DailySummary = ({ userId = 1 }) => {
  // Fetch nutrition goals
  const { data: nutritionGoal } = useQuery({
    queryKey: [`/api/nutrition-goals?userId=${userId}`],
  });

  // Fetch today's food entries
  const { data: todayEntries, isLoading } = useQuery({
    queryKey: [`/api/food-entries/daily?userId=${userId}`],
  });

  // Calculate daily totals
  const calculateDailyTotals = () => {
    if (!todayEntries || !todayEntries.length) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }
    
    return todayEntries.reduce((acc, entry) => {
      return {
        calories: acc.calories + (entry.calories || 0),
        protein: acc.protein + (entry.protein || 0),
        carbs: acc.carbs + (entry.carbs || 0),
        fat: acc.fat + (entry.fat || 0),
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  const { calories, protein, carbs, fat } = calculateDailyTotals();
  
  // Default goals if not yet loaded
  const calorieGoal = nutritionGoal?.calorieGoal || 2100;
  const proteinGoal = nutritionGoal?.proteinGoal || 120;
  const carbGoal = nutritionGoal?.carbGoal || 230;
  const fatGoal = nutritionGoal?.fatGoal || 70;
  
  // Calculate remaining calories
  const remainingCalories = calorieGoal - calories;
  
  // Calculate progress percentages
  const caloriePercentage = Math.min(100, Math.round((calories / calorieGoal) * 100));

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded mb-4"></div>
        <div className="space-y-4">
          <div className="h-10 bg-slate-200 rounded"></div>
          <div className="h-4 bg-slate-200 rounded"></div>
          <div className="grid grid-cols-3 gap-2">
            <div className="h-16 bg-slate-200 rounded"></div>
            <div className="h-16 bg-slate-200 rounded"></div>
            <div className="h-16 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="font-heading text-xl font-semibold mb-4">Today's Summary</h3>
      
      <div className="flex justify-between mb-4">
        <div>
          <p className="text-sm text-neutral-500">Daily Goal</p>
          <p className="font-mono text-xl font-semibold">{calorieGoal.toLocaleString()} <span className="text-sm font-normal">kcal</span></p>
        </div>
        <div>
          <p className="text-sm text-neutral-500">Consumed</p>
          <p className="font-mono text-xl font-semibold">{Math.round(calories).toLocaleString()} <span className="text-sm font-normal">kcal</span></p>
        </div>
        <div>
          <p className="text-sm text-neutral-500">Remaining</p>
          <p className="font-mono text-xl font-semibold text-primary">{Math.max(0, Math.round(remainingCalories)).toLocaleString()} <span className="text-sm font-normal">kcal</span></p>
        </div>
      </div>
      
      <Progress 
        value={caloriePercentage} 
        className="h-4 mb-6" 
      />
      
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-neutral-50 rounded-lg p-3">
          <p className="text-xs text-neutral-500 mb-1">Protein</p>
          <p className="font-mono font-medium">{Math.round(protein)}g <span className="text-xs font-normal text-neutral-500">/{proteinGoal}g</span></p>
        </div>
        <div className="bg-neutral-50 rounded-lg p-3">
          <p className="text-xs text-neutral-500 mb-1">Carbs</p>
          <p className="font-mono font-medium">{Math.round(carbs)}g <span className="text-xs font-normal text-neutral-500">/{carbGoal}g</span></p>
        </div>
        <div className="bg-neutral-50 rounded-lg p-3">
          <p className="text-xs text-neutral-500 mb-1">Fat</p>
          <p className="font-mono font-medium">{Math.round(fat)}g <span className="text-xs font-normal text-neutral-500">/{fatGoal}g</span></p>
        </div>
      </div>
    </div>
  );
};

export default DailySummary;
