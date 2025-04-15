export interface FoodEntryDocument {
  id: number;
  userId: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  timestamp: string;
  imageUrl?: string;
  mealType?: string;
  aiAnalysis?: string;
}

export interface NutritionGoalDocument {
  id: number;
  userId: number;
  calorieGoal: number;
  proteinGoal: number;
  carbGoal: number;
  fatGoal: number;
  createdAt: string;
  updatedAt: string;
} 