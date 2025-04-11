import { pgTable, text, serial, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Food entry schema
export const foodEntries = pgTable("food_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  servingSize: text("serving_size").notNull(),
  mealType: text("meal_type").notNull(),
  calories: real("calories"),
  protein: real("protein"),
  carbs: real("carbs"),
  fat: real("fat"),
  imageUrl: text("image_url"),
  entryDate: timestamp("entry_date").defaultNow().notNull(),
  aiAnalysis: text("ai_analysis"),
});

export const insertFoodEntrySchema = createInsertSchema(foodEntries).pick({
  userId: true,
  name: true,
  description: true,
  servingSize: true,
  mealType: true,
  calories: true,
  protein: true,
  carbs: true,
  fat: true,
  imageUrl: true,
});

export type InsertFoodEntry = z.infer<typeof insertFoodEntrySchema>;
export type FoodEntry = typeof foodEntries.$inferSelect;

// Chat message schema
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  message: text("message").notNull(),
  response: text("response"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  conversationId: text("conversation_id").notNull(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  userId: true,
  message: true,
  conversationId: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// Daily nutrition goal schema
export const nutritionGoals = pgTable("nutrition_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  calorieGoal: real("calorie_goal").notNull(),
  proteinGoal: real("protein_goal").notNull(),
  carbGoal: real("carb_goal").notNull(),
  fatGoal: real("fat_goal").notNull(),
});

export const insertNutritionGoalSchema = createInsertSchema(nutritionGoals).pick({
  userId: true,
  calorieGoal: true,
  proteinGoal: true,
  carbGoal: true,
  fatGoal: true,
});

export type InsertNutritionGoal = z.infer<typeof insertNutritionGoalSchema>;
export type NutritionGoal = typeof nutritionGoals.$inferSelect;
