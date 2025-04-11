import { 
  users, 
  type User, 
  type InsertUser, 
  type FoodEntry, 
  type InsertFoodEntry,
  type ChatMessage,
  type InsertChatMessage,
  type NutritionGoal,
  type InsertNutritionGoal
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Food entry methods
  addFoodEntry(entry: InsertFoodEntry & { aiAnalysis?: string }): Promise<FoodEntry>;
  getFoodEntriesByUserId(userId: number): Promise<FoodEntry[]>;
  getDailyFoodEntries(userId: number, date: Date): Promise<FoodEntry[]>;
  getRecentFoodEntries(userId: number, limit: number): Promise<FoodEntry[]>;
  
  // Chat methods
  addChatMessage(message: InsertChatMessage & { response?: string }): Promise<ChatMessage>;
  getChatMessagesByConversationId(conversationId: string): Promise<ChatMessage[]>;
  getUserConversations(userId: number): Promise<{ id: string, title: string, lastMessageDate: Date }[]>;
  
  // Nutrition goals methods
  setNutritionGoal(goal: InsertNutritionGoal): Promise<NutritionGoal>;
  getNutritionGoalByUserId(userId: number): Promise<NutritionGoal | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private foodEntries: Map<number, FoodEntry>;
  private chatMessages: Map<number, ChatMessage>;
  private nutritionGoals: Map<number, NutritionGoal>;
  private currentUserId: number;
  private currentFoodEntryId: number;
  private currentChatMessageId: number;
  private currentNutritionGoalId: number;

  constructor() {
    this.users = new Map();
    this.foodEntries = new Map();
    this.chatMessages = new Map();
    this.nutritionGoals = new Map();
    this.currentUserId = 1;
    this.currentFoodEntryId = 1;
    this.currentChatMessageId = 1;
    this.currentNutritionGoalId = 1;
    
    // Add default user for testing
    this.createUser({
      username: "testuser",
      password: "password123"
    });
    
    // Add default nutrition goal for test user
    this.setNutritionGoal({
      userId: 1,
      calorieGoal: 2100,
      proteinGoal: 120,
      carbGoal: 230,
      fatGoal: 70
    });
    
    // Add some default food entries for test user
    this.addFoodEntry({
      userId: 1,
      name: "Greek Yogurt Bowl",
      description: "With berries and honey",
      servingSize: "1 bowl",
      mealType: "breakfast",
      calories: 380,
      protein: 15,
      carbs: 45,
      fat: 12,
      imageUrl: "https://images.unsplash.com/photo-1505253758473-96b7015fcd40?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80"
    });
    
    this.addFoodEntry({
      userId: 1,
      name: "Grilled Chicken Salad",
      description: "With olive oil dressing",
      servingSize: "1 plate",
      mealType: "lunch",
      calories: 420,
      protein: 35,
      carbs: 20,
      fat: 22,
      imageUrl: "https://images.unsplash.com/photo-1503200831604-6f3d55b2770d?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80"
    });
    
    this.addFoodEntry({
      userId: 1,
      name: "Protein Shake",
      description: "With banana and almond milk",
      servingSize: "1 shake",
      mealType: "snack",
      calories: 220,
      protein: 25,
      carbs: 20,
      fat: 5,
      imageUrl: "https://images.unsplash.com/photo-1590779033100-9f60a05a013d?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80"
    });
    
    this.addFoodEntry({
      userId: 1,
      name: "Grilled Salmon with Vegetables",
      description: "With roasted sweet potatoes",
      servingSize: "1 serving",
      mealType: "dinner",
      calories: 520,
      protein: 40,
      carbs: 30,
      fat: 25,
      imageUrl: "https://images.unsplash.com/photo-1580013759032-c96505e24c1f?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80"
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Food entry methods
  async addFoodEntry(entry: InsertFoodEntry & { aiAnalysis?: string }): Promise<FoodEntry> {
    const id = this.currentFoodEntryId++;
    const now = new Date();
    const foodEntry: FoodEntry = { 
      ...entry, 
      id, 
      entryDate: now, 
      aiAnalysis: entry.aiAnalysis || null
    };
    this.foodEntries.set(id, foodEntry);
    return foodEntry;
  }
  
  async getFoodEntriesByUserId(userId: number): Promise<FoodEntry[]> {
    return Array.from(this.foodEntries.values())
      .filter(entry => entry.userId === userId)
      .sort((a, b) => b.entryDate.getTime() - a.entryDate.getTime());
  }
  
  async getDailyFoodEntries(userId: number, date: Date): Promise<FoodEntry[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return Array.from(this.foodEntries.values())
      .filter(entry => 
        entry.userId === userId && 
        entry.entryDate >= startOfDay && 
        entry.entryDate <= endOfDay
      )
      .sort((a, b) => a.entryDate.getTime() - b.entryDate.getTime());
  }
  
  async getRecentFoodEntries(userId: number, limit: number): Promise<FoodEntry[]> {
    return Array.from(this.foodEntries.values())
      .filter(entry => entry.userId === userId)
      .sort((a, b) => b.entryDate.getTime() - a.entryDate.getTime())
      .slice(0, limit);
  }
  
  // Chat methods
  async addChatMessage(message: InsertChatMessage & { response?: string }): Promise<ChatMessage> {
    const id = this.currentChatMessageId++;
    const now = new Date();
    const chatMessage: ChatMessage = {
      ...message,
      id,
      timestamp: now,
      response: message.response || null
    };
    this.chatMessages.set(id, chatMessage);
    return chatMessage;
  }
  
  async getChatMessagesByConversationId(conversationId: string): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter(message => message.conversationId === conversationId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
  
  async getUserConversations(userId: number): Promise<{ id: string, title: string, lastMessageDate: Date }[]> {
    const userMessages = Array.from(this.chatMessages.values())
      .filter(message => message.userId === userId);
    
    const conversationMap = new Map<string, { 
      id: string, 
      title: string, 
      lastMessageDate: Date,
      firstMessage: string
    }>();
    
    for (const message of userMessages) {
      if (!conversationMap.has(message.conversationId) || 
          conversationMap.get(message.conversationId)!.lastMessageDate < message.timestamp) {
        
        // Use the first message as the title
        const firstMessage = conversationMap.has(message.conversationId) 
          ? conversationMap.get(message.conversationId)!.firstMessage 
          : message.message;
        
        conversationMap.set(message.conversationId, {
          id: message.conversationId,
          title: firstMessage.length > 30 ? firstMessage.substring(0, 30) + '...' : firstMessage,
          lastMessageDate: message.timestamp,
          firstMessage: firstMessage
        });
      }
    }
    
    return Array.from(conversationMap.values())
      .sort((a, b) => b.lastMessageDate.getTime() - a.lastMessageDate.getTime());
  }
  
  // Nutrition goals methods
  async setNutritionGoal(goal: InsertNutritionGoal): Promise<NutritionGoal> {
    // Check if user already has a goal
    const existingGoal = await this.getNutritionGoalByUserId(goal.userId);
    
    if (existingGoal) {
      // Update existing goal
      const updatedGoal: NutritionGoal = {
        ...existingGoal,
        calorieGoal: goal.calorieGoal,
        proteinGoal: goal.proteinGoal,
        carbGoal: goal.carbGoal,
        fatGoal: goal.fatGoal
      };
      this.nutritionGoals.set(existingGoal.id, updatedGoal);
      return updatedGoal;
    } else {
      // Create new goal
      const id = this.currentNutritionGoalId++;
      const nutritionGoal: NutritionGoal = { ...goal, id };
      this.nutritionGoals.set(id, nutritionGoal);
      return nutritionGoal;
    }
  }
  
  async getNutritionGoalByUserId(userId: number): Promise<NutritionGoal | undefined> {
    return Array.from(this.nutritionGoals.values())
      .find(goal => goal.userId === userId);
  }
}

export const storage = new MemStorage();
