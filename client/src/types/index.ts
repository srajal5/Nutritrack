export interface User {
  id: number;
  username: string;
  email?: string;
  displayName?: string;
  profilePicture?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InsertUser {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface FoodEntryDocument {
  id: number;
  userId: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
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