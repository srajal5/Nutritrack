import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Document interfaces
export interface UserDocument extends mongoose.Document {
  id: number;
  username: string;
  email?: string;
  password: string;
  displayName?: string;
  firebaseId?: string;
  profilePicture?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FoodEntryDocument extends mongoose.Document {
  id: number;
  userId: number;
  name: string;
  description?: string;
  servingSize: string;
  mealType: string;
  /** Millilitres of water, for entries logged as hydration. */
  waterMl?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  imageUrl?: string;
  entryDate: Date;
  aiAnalysis?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessageDocument extends mongoose.Document {
  id: number;
  userId: number;
  message: string;
  response?: string;
  timestamp: Date;
  conversationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NutritionGoalDocument extends mongoose.Document {
  id: number;
  userId: number;
  calorieGoal: number;
  proteinGoal: number;
  carbGoal: number;
  fatGoal: number;
  fiberGoal: number;
  sugarGoal: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeightEntryDocument extends mongoose.Document {
  id: number;
  userId: number;
  weightKg: number;
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfileDocument extends mongoose.Document {
  id: number;
  userId: number;
  isCompleted: boolean;
  profile: {
    age?: number;
    gender?: string;
    biologicalSex?: string;
    heightCm?: number;
    weightKg?: number;
    targetWeightKg?: number;
    activityLevel?: string;
    fitnessLevel?: string;
  };
  goal: {
    primaryGoal?: string;
    secondaryGoals?: string[];
    targetDate?: Date;
    desiredOutcome?: string;
    goalDescription?: string;
    targetTimelineWeeks?: number;
  };
  workout: {
    daysPerWeek?: number;
    location?: string;
    equipment?: string[];
  };
  nutrition: {
    dietaryPreference?: string;
    allergies?: string[];
    dislikedFoods?: string[];
    preferredFoods?: string[];
    mealsPerDay?: number;
    calorieTarget?: number;
    proteinTarget?: number;
  };
  plan?: {
    planVersion?: number;
    generatedAt?: Date;
    targets?: {
      calories?: number;
      proteinGrams?: number;
      carbsGrams?: number;
      fatGrams?: number;
      fiberGrams?: number;
      waterMl?: number;
    };
    basis?: {
      bmr?: number;
      tdee?: number;
      goalAdjustment?: number;
      proteinGramsPerKg?: number;
    };
    aiSummary?: string;
    focusAreas?: string[];
    weeklyWorkoutPlan?: string[];
    nutritionGuidelines?: string[];
  };
  aiPlan: {
    summary?: string;
    weeklyWorkoutPlan?: string[];
    nutritionGuidelines?: string[];
    dailyTargets?: Record<string, any>;
  };
  createdAt: Date;
  updatedAt: Date;
}


// Input types for creating/updating documents
export type UserInput = Omit<UserDocument, keyof mongoose.Document | 'id'> & {
  id?: number;  // Make id optional
};
export type FoodEntryInput = Omit<FoodEntryDocument, keyof mongoose.Document | 'createdAt' | 'updatedAt'> & {
  id?: number;  // Make id optional
};
export type ChatMessageInput = {
  id: number;
  userId: number;
  message: string;
  response?: string;
  timestamp: Date;
  conversationId: string;
  createdAt: Date;
  updatedAt: Date;
};
export type NutritionGoalInput = Omit<NutritionGoalDocument, keyof mongoose.Document | 'createdAt' | 'updatedAt'>;
export type UserProfileInput = Omit<UserProfileDocument, keyof mongoose.Document | 'createdAt' | 'updatedAt' | 'id'> & {
  id?: number;
};

// Schemas
const userSchema = new mongoose.Schema<UserDocument>({
  id: { type: Number, required: true, unique: true, default: 1 },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  displayName: { type: String },
  firebaseId: { 
    type: String, 
    unique: true,
    sparse: true  // This allows multiple null values
  },
  profilePicture: { type: String },
}, { timestamps: true });

const foodEntrySchema = new mongoose.Schema<FoodEntryDocument>({
  id: { type: Number, required: true, unique: true },
  userId: { type: Number, required: true },
  name: { type: String, required: true },
  description: { type: String },
  servingSize: { type: String, required: true },
  mealType: { type: String, required: true },
  waterMl: { type: Number },
  calories: { type: Number },
  protein: { type: Number },
  carbs: { type: Number },
  fat: { type: Number },
  fiber: { type: Number },
  sugar: { type: Number },
  imageUrl: { type: String },
  entryDate: { type: Date, default: Date.now },
  aiAnalysis: { type: String },
}, { timestamps: true });

const chatMessageSchema = new mongoose.Schema<ChatMessageDocument>({
  id: { type: Number, required: true, unique: true },
  userId: { type: Number, required: true },
  message: { type: String, required: true },
  response: { type: String },
  timestamp: { type: Date, default: Date.now },
  conversationId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const nutritionGoalSchema = new mongoose.Schema<NutritionGoalDocument>({
  id: { type: Number, required: true, unique: true },
  userId: { type: Number, required: true },
  calorieGoal: { type: Number, required: true },
  proteinGoal: { type: Number, required: true },
  carbGoal: { type: Number, required: true },
  fatGoal: { type: Number, required: true },
  fiberGoal: { type: Number, required: true, default: 25 },
  sugarGoal: { type: Number, required: true, default: 50 },
}, { timestamps: true });

const userProfileSchema = new mongoose.Schema<UserProfileDocument>({
  id: { type: Number, required: true, unique: true },
  userId: { type: Number, required: true, unique: true },
  isCompleted: { type: Boolean, default: false },
  profile: {
    age: Number,
    // `gender` is the legacy field name; biologicalSex is what the calculator
    // reads. Both are written so older records stay readable.
    gender: String,
    biologicalSex: String,
    heightCm: Number,
    weightKg: Number,
    targetWeightKg: Number,
    activityLevel: String,
    fitnessLevel: String,
  },
  goal: {
    primaryGoal: String,
    secondaryGoals: [String],
    targetDate: Date,
    desiredOutcome: String,
    /** The user's own wording, preserved verbatim. */
    goalDescription: String,
    targetTimelineWeeks: Number,
  },
  workout: {
    daysPerWeek: Number,
    location: String,
    equipment: [String],
  },
  nutrition: {
    dietaryPreference: String,
    allergies: [String],
    dislikedFoods: [String],
    preferredFoods: [String],
    mealsPerDay: Number,
    calorieTarget: Number,
    proteinTarget: Number,
  },
  /**
   * The persisted personalized plan — the single source of truth the dashboard,
   * profile page and AI all read from. Written only after validation succeeds.
   */
  plan: {
    planVersion: Number,
    generatedAt: Date,
    targets: {
      calories: Number,
      proteinGrams: Number,
      carbsGrams: Number,
      fatGrams: Number,
      fiberGrams: Number,
      waterMl: Number,
    },
    basis: {
      bmr: Number,
      tdee: Number,
      goalAdjustment: Number,
      proteinGramsPerKg: Number,
    },
    aiSummary: String,
    focusAreas: [String],
    weeklyWorkoutPlan: [String],
    nutritionGuidelines: [String],
  },
  aiPlan: {
    summary: String,
    weeklyWorkoutPlan: [String],
    nutritionGuidelines: [String],
    dailyTargets: mongoose.Schema.Types.Mixed,
  }
}, { timestamps: true });


// Models
const User = mongoose.model<UserDocument>('User', userSchema);
const FoodEntry = mongoose.model<FoodEntryDocument>('FoodEntry', foodEntrySchema);
const ChatMessage = mongoose.model<ChatMessageDocument>('ChatMessage', chatMessageSchema);
const NutritionGoal = mongoose.model<NutritionGoalDocument>('NutritionGoal', nutritionGoalSchema);
const UserProfile = mongoose.model<UserProfileDocument>('UserProfile', userProfileSchema);

/** Real weight measurements. The progress trend is drawn from these only. */
const weightEntrySchema = new mongoose.Schema<WeightEntryDocument>({
  id: { type: Number, required: true, unique: true },
  userId: { type: Number, required: true, index: true },
  weightKg: { type: Number, required: true },
  recordedAt: { type: Date, required: true, default: Date.now },
}, { timestamps: true });

const WeightEntry = mongoose.model<WeightEntryDocument>('WeightEntry', weightEntrySchema);

// Storage interface
interface IStorage {
  // User operations
  createUser(userData: UserInput): Promise<UserDocument>;
  getUserByEmail(email: string): Promise<UserDocument | null>;
  getUserByUsername(username: string): Promise<UserDocument | null>;
  getUserByFirebaseId(firebaseId: string): Promise<UserDocument | null>;
  updateUser(id: number, userData: Partial<UserInput>): Promise<UserDocument | null>;
  deleteUser(id: number): Promise<boolean>;
  getUser(id: number): Promise<UserDocument | null>;
  getUserProfile(userId: number): Promise<UserProfileDocument | null>;
  updateUserProfile(userId: number, profileData: Partial<UserProfileInput>): Promise<UserProfileDocument>;

  // Food entry operations
  createFoodEntry(foodData: FoodEntryInput): Promise<FoodEntryDocument>;
  getFoodEntryById(id: number): Promise<FoodEntryDocument | null>;
  getFoodEntriesByUserId(userId: number): Promise<FoodEntryDocument[]>;
  getDailyFoodEntries(userId: number, date: Date): Promise<FoodEntryDocument[]>;
  getRecentFoodEntries(userId: number, limit: number): Promise<FoodEntryDocument[]>;
  updateFoodEntry(id: number, foodData: Partial<FoodEntryInput>): Promise<FoodEntryDocument | null>;
  deleteFoodEntry(id: number): Promise<boolean>;

  // Chat message operations
  createChatMessage(messageData: ChatMessageInput): Promise<ChatMessageDocument>;
  getChatMessagesByUserId(userId: number): Promise<ChatMessageDocument[]>;
  getChatMessagesByConversationId(conversationId: string): Promise<ChatMessageDocument[]>;
  deleteChatMessage(id: number): Promise<boolean>;

  // Nutrition goal operations
  createNutritionGoal(goalData: NutritionGoalInput): Promise<NutritionGoalDocument>;
  getNutritionGoalById(id: number): Promise<NutritionGoalDocument | null>;
  getNutritionGoalsByUserId(userId: number): Promise<NutritionGoalDocument[]>;
  getNutritionGoalByUserId(userId: number): Promise<NutritionGoalDocument | null>;
  updateNutritionGoal(id: number, goalData: Partial<NutritionGoalInput>): Promise<NutritionGoalDocument | null>;
  deleteNutritionGoal(id: number): Promise<boolean>;
  setNutritionGoal(goalData: NutritionGoalInput): Promise<NutritionGoalDocument>;

  // Additional operations
  getUserConversations(userId: number): Promise<string[]>;
}

// Storage implementation
class Storage implements IStorage {
  private userModel = User;
  private foodEntryModel = FoodEntry;
  private chatMessageModel = ChatMessage;
  private nutritionGoalModel = NutritionGoal;

  // User operations
  async createUser(userData: UserInput): Promise<UserDocument> {
    // Get the highest existing ID
    const lastUser = await this.userModel.findOne().sort({ id: -1 });
    const newId = lastUser ? lastUser.id + 1 : 1;

    // Password is already hashed in auth.ts, so we don't hash it again here
    // Ensure firebaseId is set to avoid null values
    const userDataWithId = {
      ...userData,
      id: newId,
      firebaseId: userData.firebaseId || `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    };
    
    const user = new this.userModel(userDataWithId);
    return await user.save();
  }

  async getUserByEmail(email: string): Promise<UserDocument | null> {
    return await this.userModel.findOne({ email });
  }

  async getUserByUsername(username: string): Promise<UserDocument | null> {
    return await this.userModel.findOne({ username });
  }

  async getUserByFirebaseId(firebaseId: string): Promise<UserDocument | null> {
    return await this.userModel.findOne({ firebaseId });
  }

  async updateUser(id: number, userData: Partial<UserInput>): Promise<UserDocument | null> {
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    return await this.userModel.findOneAndUpdate({ id }, userData, { new: true });
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await this.userModel.findOneAndDelete({ id });
    return result !== null;
  }

  async getUser(id: number): Promise<UserDocument | null> {
    return await this.userModel.findOne({ id });
  }

  async getUserProfile(userId: number): Promise<UserProfileDocument | null> {
    return await UserProfile.findOne({ userId });
  }

  // Weight history operations
  async addWeightEntry(userId: number, weightKg: number, recordedAt?: Date): Promise<WeightEntryDocument> {
    const last = await WeightEntry.findOne().sort({ id: -1 });
    const newId = last ? last.id + 1 : 1;
    const entry = new WeightEntry({ id: newId, userId, weightKg, recordedAt: recordedAt || new Date() });
    return await entry.save();
  }

  /** Most recent first. Scoped to the authenticated user by the caller. */
  async getWeightEntries(userId: number, limit = 60): Promise<WeightEntryDocument[]> {
    return await WeightEntry.find({ userId }).sort({ recordedAt: -1 }).limit(limit);
  }

  async updateUserProfile(userId: number, profileData: Partial<UserProfileInput>): Promise<UserProfileDocument> {
    let profile = await UserProfile.findOne({ userId });
    
    if (!profile) {
      const lastProfile = await UserProfile.findOne().sort({ id: -1 });
      const newId = lastProfile ? lastProfile.id + 1 : 1;
      
      profile = new UserProfile({
        ...profileData,
        userId,
        id: newId
      });
    } else {
      Object.assign(profile, profileData);
    }
    
    return await profile.save();
  }

  // Food entry operations
  async createFoodEntry(foodData: FoodEntryInput): Promise<FoodEntryDocument> {
    // Get the highest existing ID
    const lastEntry = await this.foodEntryModel.findOne().sort({ id: -1 });
    const newId = lastEntry ? lastEntry.id + 1 : 1;

    const foodEntry = new this.foodEntryModel({
      ...foodData,
      id: newId,
      entryDate: foodData.entryDate || new Date()  // Ensure entryDate is set
    });
    return await foodEntry.save();
  }

  async getFoodEntryById(id: number): Promise<FoodEntryDocument | null> {
    return await this.foodEntryModel.findOne({ id });
  }

  async getFoodEntriesByUserId(userId: number): Promise<FoodEntryDocument[]> {
    return await this.foodEntryModel.find({ userId });
  }

  async getDailyFoodEntries(userId: number, date: Date): Promise<FoodEntryDocument[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return await this.foodEntryModel.find({
      userId,
      entryDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });
  }

  async getRecentFoodEntries(userId: number, limit: number): Promise<FoodEntryDocument[]> {
    return await this.foodEntryModel
      .find({ userId })
      .sort({ entryDate: -1 })
      .limit(limit);
  }
  
  async updateFoodEntry(id: number, foodData: Partial<FoodEntryInput>): Promise<FoodEntryDocument | null> {
    return await this.foodEntryModel.findOneAndUpdate({ id }, foodData, { new: true });
  }

  async deleteFoodEntry(id: number): Promise<boolean> {
    const result = await this.foodEntryModel.findOneAndDelete({ id });
    return result !== null;
  }

  // Chat message operations
  async createChatMessage(messageData: ChatMessageInput): Promise<ChatMessageDocument> {
    const chatMessage = new this.chatMessageModel(messageData);
    return await chatMessage.save();
  }

  async getChatMessagesByUserId(userId: number): Promise<ChatMessageDocument[]> {
    return await this.chatMessageModel.find({ userId });
  }

  async getChatMessagesByConversationId(conversationId: string): Promise<ChatMessageDocument[]> {
    return await this.chatMessageModel.find({ conversationId }).sort({ timestamp: 1 });
  }

  async deleteChatMessage(id: number): Promise<boolean> {
    const result = await this.chatMessageModel.findOneAndDelete({ id });
    return result !== null;
  }

  // Nutrition goal operations
  async createNutritionGoal(goalData: NutritionGoalInput): Promise<NutritionGoalDocument> {
    const lastGoal = await this.nutritionGoalModel.findOne().sort({ id: -1 });
    const newId = lastGoal ? lastGoal.id + 1 : 1;
    const nutritionGoal = new this.nutritionGoalModel({ ...goalData, id: newId });
    return await nutritionGoal.save();
  }

  async getNutritionGoalById(id: number): Promise<NutritionGoalDocument | null> {
    return await this.nutritionGoalModel.findOne({ id });
  }

  async getNutritionGoalsByUserId(userId: number): Promise<NutritionGoalDocument[]> {
    return await this.nutritionGoalModel.find({ userId });
  }

  async getNutritionGoalByUserId(userId: number): Promise<NutritionGoalDocument | null> {
    return await this.nutritionGoalModel.findOne({ userId });
  }

  async updateNutritionGoal(id: number, goalData: Partial<NutritionGoalInput>): Promise<NutritionGoalDocument | null> {
    return await this.nutritionGoalModel.findOneAndUpdate({ id }, goalData, { new: true });
  }

  async deleteNutritionGoal(id: number): Promise<boolean> {
    const result = await this.nutritionGoalModel.findOneAndDelete({ id });
    return result !== null;
  }

  async setNutritionGoal(goalData: NutritionGoalInput): Promise<NutritionGoalDocument> {
    // Check if a goal already exists for this user
    const existingGoal = await this.nutritionGoalModel.findOne({ userId: goalData.userId });
    
    if (existingGoal) {
      // Update existing goal
      return await this.nutritionGoalModel.findOneAndUpdate(
        { userId: goalData.userId },
        goalData,
        { new: true }
      ) as NutritionGoalDocument;
    } else {
      // Create new goal using the existing method which handles ID generation
      return await this.createNutritionGoal(goalData);
    }
  }

  // Additional operations
  async getUserConversations(userId: number): Promise<string[]> {
    const messages = await this.chatMessageModel.find({ userId }).distinct('conversationId');
    return messages;
  }
}

// Export the storage instance
export default new Storage();
