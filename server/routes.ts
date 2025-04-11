import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertChatMessageSchema, insertFoodEntrySchema, insertNutritionGoalSchema } from "@shared/schema";
import { analyzeFoodEntry, getFitnessResponse, getNutritionRecommendations } from "./openai";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // prefix all routes with /api
  
  // Food Entries API
  app.post("/api/food-entries", async (req, res) => {
    try {
      const foodEntryData = insertFoodEntrySchema.parse(req.body);
      
      // Analyze food entry with OpenAI if not provided
      if (!foodEntryData.calories || !foodEntryData.protein || !foodEntryData.carbs || !foodEntryData.fat) {
        const analysis = await analyzeFoodEntry(
          foodEntryData.name,
          foodEntryData.description || "",
          foodEntryData.servingSize
        );
        
        foodEntryData.calories = analysis.calories;
        foodEntryData.protein = analysis.protein;
        foodEntryData.carbs = analysis.carbs;
        foodEntryData.fat = analysis.fat;
        
        const foodEntry = await storage.addFoodEntry({
          ...foodEntryData,
          aiAnalysis: analysis.analysis
        });
        
        return res.status(201).json(foodEntry);
      }
      
      const foodEntry = await storage.addFoodEntry(foodEntryData);
      res.status(201).json(foodEntry);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to add food entry" });
    }
  });

  app.get("/api/food-entries", async (req, res) => {
    try {
      const userId = Number(req.query.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const foodEntries = await storage.getFoodEntriesByUserId(userId);
      res.json(foodEntries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch food entries" });
    }
  });

  app.get("/api/food-entries/daily", async (req, res) => {
    try {
      const userId = Number(req.query.userId);
      const dateString = req.query.date as string;
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const date = dateString ? new Date(dateString) : new Date();
      const dailyEntries = await storage.getDailyFoodEntries(userId, date);
      res.json(dailyEntries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch daily food entries" });
    }
  });

  // Chat API
  app.post("/api/chat", async (req, res) => {
    try {
      const chatData = insertChatMessageSchema.parse(req.body);
      const previousMessages = await storage.getChatMessagesByConversationId(chatData.conversationId);
      
      // Format previous messages for OpenAI
      const formattedPreviousMessages = previousMessages.map(msg => ({
        role: msg.userId ? "user" : "assistant" as "user" | "assistant",
        content: msg.userId ? msg.message : msg.response || ""
      }));
      
      // Get response from OpenAI
      const response = await getFitnessResponse(chatData.message, formattedPreviousMessages);
      
      // Save the chat message with the response
      const chatMessage = await storage.addChatMessage({
        ...chatData,
        response
      });
      
      res.status(201).json(chatMessage);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  app.get("/api/chat/conversations", async (req, res) => {
    try {
      const userId = Number(req.query.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user conversations" });
    }
  });

  app.get("/api/chat/messages", async (req, res) => {
    try {
      const conversationId = req.query.conversationId as string;
      if (!conversationId) {
        return res.status(400).json({ message: "Conversation ID is required" });
      }
      
      const messages = await storage.getChatMessagesByConversationId(conversationId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  // Nutrition Goals API
  app.post("/api/nutrition-goals", async (req, res) => {
    try {
      const goalData = insertNutritionGoalSchema.parse(req.body);
      const nutritionGoal = await storage.setNutritionGoal(goalData);
      res.status(201).json(nutritionGoal);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to set nutrition goals" });
    }
  });

  app.get("/api/nutrition-goals", async (req, res) => {
    try {
      const userId = Number(req.query.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const nutritionGoal = await storage.getNutritionGoalByUserId(userId);
      if (!nutritionGoal) {
        return res.status(404).json({ message: "Nutrition goals not found" });
      }
      
      res.json(nutritionGoal);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch nutrition goals" });
    }
  });

  // Recommendations API
  app.get("/api/recommendations", async (req, res) => {
    try {
      const userId = Number(req.query.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Get user's food entries and nutrition goals
      const recentEntries = await storage.getRecentFoodEntries(userId, 10);
      const nutritionGoal = await storage.getNutritionGoalByUserId(userId);
      
      if (!nutritionGoal) {
        return res.status(404).json({ message: "Nutrition goals not found" });
      }
      
      // Get recommendations from OpenAI
      const recommendations = await getNutritionRecommendations(
        recentEntries,
        nutritionGoal
      );
      
      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ message: "Failed to get recommendations" });
    }
  });

  // Sample nutrition topics
  app.get("/api/chat/topics", (req, res) => {
    const topics = [
      "How many calories should I eat to lose weight?",
      "What's a good protein intake for muscle building?",
      "Recommend a beginner workout routine",
      "How to improve my running endurance?",
      "What are the best foods for recovery after a workout?",
      "How to reduce sugar cravings while dieting?"
    ];
    res.json(topics);
  });

  const httpServer = createServer(app);
  return httpServer;
}
