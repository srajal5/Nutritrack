import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertChatMessageSchema, insertFoodEntrySchema, insertNutritionGoalSchema } from "@shared/schema";
import { analyzeFoodEntry, getFitnessResponse, getNutritionRecommendations } from "./openai";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { setupAuth } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // prefix all routes with /api
  
  // Food Entries API
  app.post("/api/food-entries", async (req, res) => {
    try {
      const foodEntryData = insertFoodEntrySchema.parse(req.body);
      
      // Analyze food entry with OpenAI if not provided
      if (!foodEntryData.calories || !foodEntryData.protein || !foodEntryData.carbs || !foodEntryData.fat) {
        try {
          // Check if image is provided
          const imageBase64 = foodEntryData.imageUrl as string;
          
          const analysis = await analyzeFoodEntry(
            foodEntryData.name,
            foodEntryData.description || "",
            foodEntryData.servingSize,
            imageBase64
          );
          
          foodEntryData.calories = analysis.calories;
          foodEntryData.protein = analysis.protein;
          foodEntryData.carbs = analysis.carbs;
          foodEntryData.fat = analysis.fat;
          
          // Create a detailed analysis that includes ingredients and health benefits
          const detailedAnalysis = `
${analysis.analysis}

Ingredients: ${analysis.ingredients?.join(', ') || 'Not available'}

Health Benefits: ${analysis.healthBenefits?.join(', ') || 'Not available'}

Possible Allergens: ${analysis.possibleAllergens?.join(', ') || 'None detected'}
          `.trim();
          
          const foodEntry = await storage.addFoodEntry({
            ...foodEntryData,
            aiAnalysis: detailedAnalysis
          });
          
          return res.status(201).json(foodEntry);
        } catch (openaiError) {
          console.error("Error analyzing food entry:", openaiError);
          
          // Fallback to estimated values if OpenAI fails
          // These are reasonable defaults based on the food name
          const name = foodEntryData.name.toLowerCase();
          
          // Basic food category detection
          const isProteinFood = name.includes("chicken") || name.includes("beef") || name.includes("fish") || 
                              name.includes("protein") || name.includes("yogurt") || name.includes("egg");
          const isCarbs = name.includes("rice") || name.includes("pasta") || name.includes("bread") || 
                        name.includes("potato") || name.includes("oats");
          const isFruit = name.includes("apple") || name.includes("banana") || name.includes("berry") || 
                        name.includes("fruit");
          const isVegetable = name.includes("salad") || name.includes("vegetable") || name.includes("broccoli");
          
          // Set default values based on food category
          if (isProteinFood) {
            foodEntryData.calories = 250;
            foodEntryData.protein = 25;
            foodEntryData.carbs = 5;
            foodEntryData.fat = 15;
          } else if (isCarbs) {
            foodEntryData.calories = 200;
            foodEntryData.protein = 5;
            foodEntryData.carbs = 40;
            foodEntryData.fat = 1;
          } else if (isFruit) {
            foodEntryData.calories = 100;
            foodEntryData.protein = 1;
            foodEntryData.carbs = 25;
            foodEntryData.fat = 0;
          } else if (isVegetable) {
            foodEntryData.calories = 50;
            foodEntryData.protein = 2;
            foodEntryData.carbs = 10;
            foodEntryData.fat = 0;
          } else {
            // Default balanced meal
            foodEntryData.calories = 350;
            foodEntryData.protein = 15;
            foodEntryData.carbs = 30;
            foodEntryData.fat = 15;
          }
          
          const foodEntry = await storage.addFoodEntry({
            ...foodEntryData,
            aiAnalysis: "Analysis unavailable. Using estimated values based on food type."
          });
          
          return res.status(201).json(foodEntry);
        }
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
      
      let response;
      try {
        // Get response from OpenAI
        response = await getFitnessResponse(chatData.message, formattedPreviousMessages);
      } catch (openaiError) {
        console.error("Error getting fitness response:", openaiError);
        // Fallback response if OpenAI fails
        response = "I'm sorry, I'm currently unable to process your request due to high demand. Here are some general fitness tips: stay hydrated, aim for balanced nutrition with adequate protein, and ensure you're getting enough rest between workouts.";
      }
      
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
      
      try {
        // Get recommendations from OpenAI
        const recommendations = await getNutritionRecommendations(
          recentEntries,
          nutritionGoal
        );
        
        res.json(recommendations);
      } catch (error) {
        console.error("Error getting nutrition recommendations:", error);
        
        // Fallback recommendations
        const fallbackRecommendations = [
          {
            title: "Balance Your Meals",
            description: "Aim for a balance of protein, carbs, and healthy fats in each meal for sustained energy."
          },
          {
            title: "Stay Hydrated",
            description: "Drink at least 8 glasses of water daily to support metabolism and overall health."
          },
          {
            title: "Portion Control",
            description: "Be mindful of portion sizes to maintain proper calorie intake for your goals."
          }
        ];
        
        res.json(fallbackRecommendations);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to process recommendation request" });
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
