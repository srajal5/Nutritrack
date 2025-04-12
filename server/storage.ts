import { 
  users, 
  type User, 
  type InsertUser, 
  foodEntries,
  type FoodEntry, 
  type InsertFoodEntry,
  chatMessages,
  type ChatMessage,
  type InsertChatMessage,
  nutritionGoals,
  type NutritionGoal,
  type InsertNutritionGoal
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

// Session store for PostgreSQL
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByFirebaseId(firebaseId: string): Promise<User | undefined>;
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
  
  // Session store for auth
  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  // Food entry methods
  async addFoodEntry(entry: InsertFoodEntry & { aiAnalysis?: string }): Promise<FoodEntry> {
    const [foodEntry] = await db.insert(foodEntries).values({
      ...entry,
      entryDate: new Date(),
      aiAnalysis: entry.aiAnalysis || null
    }).returning();
    return foodEntry;
  }
  
  async getFoodEntriesByUserId(userId: number): Promise<FoodEntry[]> {
    return await db.select()
      .from(foodEntries)
      .where(eq(foodEntries.userId, userId))
      .orderBy(desc(foodEntries.entryDate));
  }
  
  async getDailyFoodEntries(userId: number, date: Date): Promise<FoodEntry[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return await db.select()
      .from(foodEntries)
      .where(
        and(
          eq(foodEntries.userId, userId),
          gte(foodEntries.entryDate, startOfDay),
          lte(foodEntries.entryDate, endOfDay)
        )
      )
      .orderBy(foodEntries.entryDate);
  }
  
  async getRecentFoodEntries(userId: number, limit: number): Promise<FoodEntry[]> {
    return await db.select()
      .from(foodEntries)
      .where(eq(foodEntries.userId, userId))
      .orderBy(desc(foodEntries.entryDate))
      .limit(limit);
  }
  
  // Chat methods
  async addChatMessage(message: InsertChatMessage & { response?: string }): Promise<ChatMessage> {
    const [chatMessage] = await db.insert(chatMessages).values({
      ...message,
      timestamp: new Date(),
      response: message.response || null
    }).returning();
    return chatMessage;
  }
  
  async getChatMessagesByConversationId(conversationId: string): Promise<ChatMessage[]> {
    return await db.select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(chatMessages.timestamp);
  }
  
  async getUserConversations(userId: number): Promise<{ id: string, title: string, lastMessageDate: Date }[]> {
    // Get all user messages
    const messages = await db.select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId));
    
    // Group by conversation and find the latest messages
    const conversations = new Map<string, { 
      id: string, 
      title: string, 
      lastMessageDate: Date,
      firstMessage: string
    }>();
    
    for (const message of messages) {
      if (!conversations.has(message.conversationId) || 
          conversations.get(message.conversationId)!.lastMessageDate < message.timestamp) {
        
        // Use the first message as the title
        const firstMessage = conversations.has(message.conversationId) 
          ? conversations.get(message.conversationId)!.firstMessage 
          : message.message;
        
        conversations.set(message.conversationId, {
          id: message.conversationId,
          title: firstMessage.length > 30 ? firstMessage.substring(0, 30) + '...' : firstMessage,
          lastMessageDate: message.timestamp,
          firstMessage: firstMessage
        });
      }
    }
    
    return Array.from(conversations.values())
      .sort((a, b) => b.lastMessageDate.getTime() - a.lastMessageDate.getTime());
  }
  
  // Nutrition goals methods
  async setNutritionGoal(goal: InsertNutritionGoal): Promise<NutritionGoal> {
    // Check if user already has a goal
    const existingGoal = await this.getNutritionGoalByUserId(goal.userId);
    
    if (existingGoal) {
      // Update existing goal
      const [updatedGoal] = await db.update(nutritionGoals)
        .set({
          calorieGoal: goal.calorieGoal,
          proteinGoal: goal.proteinGoal,
          carbGoal: goal.carbGoal,
          fatGoal: goal.fatGoal
        })
        .where(eq(nutritionGoals.id, existingGoal.id))
        .returning();
      return updatedGoal;
    } else {
      // Create new goal
      const [newGoal] = await db.insert(nutritionGoals)
        .values(goal)
        .returning();
      return newGoal;
    }
  }
  
  async getNutritionGoalByUserId(userId: number): Promise<NutritionGoal | undefined> {
    const [goal] = await db.select()
      .from(nutritionGoals)
      .where(eq(nutritionGoals.userId, userId));
    return goal;
  }
}

// Create a new instance of the DatabaseStorage
export const storage = new DatabaseStorage();