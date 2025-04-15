import { useQuery } from '@tanstack/react-query';
import { FoodEntryDocument, NutritionGoalDocument } from '../types';
import { getQueryFn } from '../lib/queryClient';
import { useAuth } from '../hooks/use-auth';

const NutritionHighlights = () => {
  const { user } = useAuth();
  const userId = user?.id;

  // Fetch food entries
  const { data: foodEntries = [], isLoading } = useQuery<FoodEntryDocument[]>({
    queryKey: [`/api/food-entries?userId=${userId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!userId,
    initialData: []
  });
  
  // Fetch nutrition goals
  const { data: nutritionGoal } = useQuery<NutritionGoalDocument>({
    queryKey: [`/api/nutrition-goals?userId=${userId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!userId
  });
  
  // Calculate highlights
  const calculateHighlights = () => {
    if (!foodEntries || !foodEntries.length) {
      return {
        avgCalories: 0,
        proteinGoalPct: 0,
        waterIntake: 2.1, // Default value since we're not tracking this yet
        sugarIntake: 0
      };
    }
    
    // Group entries by day
    const entriesByDay = foodEntries.reduce((acc, entry) => {
      const date = new Date(entry.timestamp).toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(entry);
      return acc;
    }, {} as Record<string, typeof foodEntries>);
    
    // Calculate daily averages
    const days = Object.keys(entriesByDay);
    const dayCount = days.length;
    
    // Sum total calories per day
    const dailyCalories = days.map(day => 
      entriesByDay[day].reduce((sum, entry) => sum + entry.calories, 0)
    );
    
    // Average daily calories
    const avgCalories = dailyCalories.reduce((sum, cals) => sum + cals, 0) / dayCount;
    
    // Sum total protein
    const totalProtein = foodEntries.reduce((sum, entry) => sum + entry.protein, 0);
    
    // Protein goal percentage (last 7 days)
    const proteinGoalPct = nutritionGoal 
      ? Math.round((totalProtein / (nutritionGoal.proteinGoal * dayCount)) * 100)
      : 0;
    
    // We would normally calculate these from tracked data
    // For now, using static values
    const waterIntake = 2.1;
    const sugarIntake = 31;
    
    return {
      avgCalories,
      proteinGoalPct,
      waterIntake,
      sugarIntake
    };
  };
  
  const { avgCalories, proteinGoalPct, waterIntake, sugarIntake } = calculateHighlights();
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded mb-4"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 rounded"></div>
          ))}
        </div>
        <div className="h-6 bg-slate-200 rounded mb-4"></div>
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="font-heading text-xl font-semibold mb-4">Nutrition Highlights</h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-neutral-50 rounded-lg p-4 text-center">
          <p className="text-sm text-neutral-500 mb-1">Avg. Daily Calories</p>
          <p className="font-mono text-xl font-semibold">{Math.round(avgCalories)}</p>
        </div>
        <div className="bg-neutral-50 rounded-lg p-4 text-center">
          <p className="text-sm text-neutral-500 mb-1">Protein Goal</p>
          <p className="font-mono text-xl font-semibold">{proteinGoalPct}%</p>
        </div>
        <div className="bg-neutral-50 rounded-lg p-4 text-center">
          <p className="text-sm text-neutral-500 mb-1">Water Intake</p>
          <p className="font-mono text-xl font-semibold">{waterIntake}L</p>
        </div>
        <div className="bg-neutral-50 rounded-lg p-4 text-center">
          <p className="text-sm text-neutral-500 mb-1">Sugar Intake</p>
          <p className="font-mono text-xl font-semibold">{sugarIntake}g</p>
        </div>
      </div>
      
      <div className="mt-6">
        <h4 className="font-medium mb-2">Recent Achievements</h4>
        <div className="space-y-3">
          <div className="flex items-center p-3 bg-green-50 rounded-lg">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="font-medium">Protein Goal Champion</p>
              <p className="text-sm text-neutral-600">Met protein goals 5 days in a row</p>
            </div>
          </div>
          <div className="flex items-center p-3 bg-blue-50 rounded-lg">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="font-medium">Hydration Hero</p>
              <p className="text-sm text-neutral-600">Reached water intake goals for 7 days</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NutritionHighlights;
