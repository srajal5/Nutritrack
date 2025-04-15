import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

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
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  imageUrl?: string;
  entryDate: Date;
  aiAnalysis?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessageDocument extends mongoose.Document {
  id: number;
  userId: number | string;
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
  createdAt: Date;
  updatedAt: Date;
}

// Input types for creating/updating documents
export type UserInput = Omit<UserDocument, keyof mongoose.Document | 'id'> & {
  id?: number;  // Make id optional
};
export type FoodEntryInput = Omit<FoodEntryDocument, keyof mongoose.Document>;
export type ChatMessageInput = {
  id: number;
  userId: number | string;
  message: string;
  response?: string;
  timestamp: Date;
  conversationId: string;
  createdAt: Date;
  updatedAt: Date;
};
export type NutritionGoalInput = Omit<NutritionGoalDocument, keyof mongoose.Document>;

// Schemas
const userSchema = new mongoose.Schema<UserDocument>({
  id: { type: Number, required: true, unique: true, default: 1 },
  username: { type: String, required: true, unique: true },
  email: { type: String },
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
  calories: { type: Number },
  protein: { type: Number },
  carbs: { type: Number },
  fat: { type: Number },
  imageUrl: { type: String },
  entryDate: { type: Date, default: Date.now },
  aiAnalysis: { type: String },
}, { timestamps: true });

const chatMessageSchema = new mongoose.Schema<ChatMessageDocument>({
  id: { type: Number, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.Mixed, required: true },
  message: { type: String, required: true },
  response: { type: String },
  timestamp: { type: Date, default: Date.now },
  conversationId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const nutritionGoalSchema = new mongoose.Schema<NutritionGoalDocument>({
  id: { type: Number, required: true, unique: true },
  userId: { type: Number, required: true, unique: true },
  calorieGoal: { type: Number, required: true },
  proteinGoal: { type: Number, required: true },
  carbGoal: { type: Number, required: true },
  fatGoal: { type: Number, required: true },
}, { timestamps: true });

// Models
const User = mongoose.model<UserDocument>('User', userSchema);
const FoodEntry = mongoose.model<FoodEntryDocument>('FoodEntry', foodEntrySchema);
const ChatMessage = mongoose.model<ChatMessageDocument>('ChatMessage', chatMessageSchema);
const NutritionGoal = mongoose.model<NutritionGoalDocument>('NutritionGoal', nutritionGoalSchema);

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

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    // Ensure firebaseId is set to avoid null values
    const userDataWithId = {
      ...userData,
      id: newId,
      password: hashedPassword,
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

  // Food entry operations
  async createFoodEntry(foodData: FoodEntryInput): Promise<FoodEntryDocument> {
    const foodEntry = new this.foodEntryModel(foodData);
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
    const nutritionGoal = new this.nutritionGoalModel(goalData);
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
    const existingGoal = await this.getNutritionGoalByUserId(goalData.userId);
    if (existingGoal) {
      return await this.updateNutritionGoal(existingGoal.id, goalData) as NutritionGoalDocument;
    }
    return await this.createNutritionGoal(goalData);
  }

  // Additional operations
  async getUserConversations(userId: number): Promise<string[]> {
    const messages = await this.chatMessageModel.find({ userId }).distinct('conversationId');
    return messages;
  }
}

// Export the storage instance
export default new Storage();