import mongoose from 'mongoose';

// Interfaces
export interface IUser {
  username: string;
  password: string;
  email?: string;
  displayName?: string;
  firebaseId?: string;
  profilePicture?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IFoodEntry {
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  servingSize: string;
  mealType: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  imageUrl?: string;
  aiAnalysis?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IChatMessage {
  userId: mongoose.Types.ObjectId;
  message: string;
  response?: string;
  conversationId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface INutritionGoal {
  userId: mongoose.Types.ObjectId;
  calorieGoal: number;
  proteinGoal: number;
  carbGoal: number;
  fatGoal: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String },
  displayName: { type: String },
  firebaseId: { type: String, unique: true, sparse: true },
  profilePicture: { type: String }
}, { timestamps: true });

// Food Entry Schema
const foodEntrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String },
  servingSize: { type: String, required: true },
  mealType: { type: String, required: true },
  calories: { type: Number },
  protein: { type: Number },
  carbs: { type: Number },
  fat: { type: Number },
  imageUrl: { type: String },
  aiAnalysis: { type: String }
}, { timestamps: true });

// Chat Message Schema
const chatMessageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  response: { type: String },
  conversationId: { type: String, required: true }
}, { timestamps: true });

// Nutrition Goal Schema
const nutritionGoalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  calorieGoal: { type: Number, required: true },
  proteinGoal: { type: Number, required: true },
  carbGoal: { type: Number, required: true },
  fatGoal: { type: Number, required: true }
}, { timestamps: true });

// Create and export models
export const User = mongoose.model('User', userSchema);
export const FoodEntry = mongoose.model('FoodEntry', foodEntrySchema);
export const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
export const NutritionGoal = mongoose.model('NutritionGoal', nutritionGoalSchema); 