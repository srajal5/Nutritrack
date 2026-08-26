import type { Express, Request, Response } from "express";

import storage, { type UserDocument, type NutritionGoalInput } from "./storage";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { setupAuth } from "./auth";
import { getFitnessResponse, getNutritionRecommendations } from "./openai";
import { ensureAuthenticated } from "./middleware";
import foodEntriesRouter from './routes/food-entries';
import nutritionGoalsRouter from './routes/nutrition-goals';
import dashboardRouter from './routes/dashboard';
import statsRouter from './routes/stats';
import userProfilesRouter from './routes/user-profiles';
import config from "./config";
import mongoose from "mongoose";

// Extend Express.Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: UserDocument;
    }
  }
}

export async function registerRoutes(app: Express): Promise<void> {
  // Set up authentication
  setupAuth(app);

  // Liveness/diagnostics. On serverless this is also answered before the route
  // tree boots, so it still reports back when something failed to initialise.
  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      env: process.env.NODE_ENV || 'development',
      database: mongoose.connection.readyState === 1 ? 'ok' : `readyState=${mongoose.connection.readyState}`,
    });
  });

  // prefix all routes with /api
  // NOTE: Food entries routes are handled by the foodEntriesRouter (mounted below)

  // Enhanced Chat API
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, conversationId, userContext } = req.body;
      
      if (!message || !conversationId) {
        return res.status(400).json({ message: "Message and conversation ID are required" });
      }

      // Handle both authenticated and anonymous users
      const userId = req.isAuthenticated() && req.user?.id ? req.user.id : 0; // Use 0 for anonymous users
      
      // Get previous messages for context
      const previousMessages = await storage.getChatMessagesByConversationId(conversationId);
      
      // Format messages for OpenAI
      const formattedPreviousMessages = previousMessages.flatMap(msg => [
        { role: "user" as const, content: msg.message },
        { role: "assistant" as const, content: msg.response || "" }
      ]).filter(msg => msg.content);

      // Get enhanced AI response with user context
      const aiResponse = await getFitnessResponse(message, formattedPreviousMessages, userContext);
      
      // Create chat message with generated ID
      const chatMessage = await storage.createChatMessage({
        id: Date.now(), // Simple ID generation
        userId,
        message,
        response: aiResponse.response,
        timestamp: new Date(),
        conversationId,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Return enhanced response with structured data
      // Convert Mongoose document to plain object to avoid serialization issues
      const plainMessage = chatMessage.toObject ? chatMessage.toObject() : chatMessage;
      res.json({
        ...plainMessage,
        response: aiResponse.response, // Ensure the AI response text is explicitly set
        actionItems: aiResponse.actionItems,
        followUpQuestions: aiResponse.followUpQuestions,
        category: aiResponse.category,
        confidence: aiResponse.confidence
      });
    } catch (error) {
      console.error('Error in chat route:', error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  app.get("/api/chat/conversations", ensureAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const conversations = await storage.getUserConversations(req.user.id);
      res.json(conversations || []);
    } catch (error) {
      console.error("Error fetching user conversations:", error);
      res.status(500).json({ 
        message: "Failed to fetch user conversations", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.get("/api/chat/messages", ensureAuthenticated, async (req, res) => {
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
  app.post("/api/nutrition-goals", ensureAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const goalData: NutritionGoalInput = {
        userId: req.user.id,
        calorieGoal: Number(req.body.calorieGoal),
        proteinGoal: Number(req.body.proteinGoal),
        carbGoal: Number(req.body.carbGoal),
        fatGoal: Number(req.body.fatGoal),
        fiberGoal: req.body.fiberGoal ? Number(req.body.fiberGoal) : config.defaults.nutrition.fiberGoal || 30,
        sugarGoal: req.body.sugarGoal ? Number(req.body.sugarGoal) : config.defaults.nutrition.sugarGoal || 50
      };

      const nutritionGoal = await storage.setNutritionGoal(goalData);
      res.status(201).json(nutritionGoal);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to set nutrition goals" });
    }
  });

  app.get("/api/nutrition-goals", ensureAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get userId from query parameter or authenticated user
      const userId = req.query.userId ? Number(req.query.userId) : req.user.id;
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const nutritionGoal = await storage.getNutritionGoalByUserId(userId);
      if (!nutritionGoal) {
        // Return default goals if none exist
        return res.json({
          userId: userId,
          calorieGoal: config.defaults.nutrition.calorieGoal,
          proteinGoal: config.defaults.nutrition.proteinGoal,
          carbGoal: config.defaults.nutrition.carbGoal,
          fatGoal: config.defaults.nutrition.fatGoal,
          fiberGoal: config.defaults.nutrition.fiberGoal,
          sugarGoal: config.defaults.nutrition.sugarGoal,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      res.json(nutritionGoal);
    } catch (error) {
      console.error("Error fetching nutrition goals:", error);
      res.status(500).json({ 
        message: "Failed to fetch nutrition goals", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Recommendations API
  app.get("/api/recommendations", ensureAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get user's food entries and nutrition goals
      const recentEntries = await storage.getRecentFoodEntries(req.user.id, 10);
      const nutritionGoal = await storage.getNutritionGoalByUserId(req.user.id);
      
      if (!nutritionGoal) {
        return res.status(404).json({ message: "Nutrition goals not found" });
      }
      
      try {
        // Get recommendations from OpenAI
        const recommendations = await getNutritionRecommendations(
          recentEntries.map(entry => ({
            name: entry.name,
            calories: entry.calories || 0,
            protein: entry.protein || 0,
            carbs: entry.carbs || 0,
            fat: entry.fat || 0
          })),
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
      console.error("Error processing recommendation request:", error);
      res.status(500).json({ 
        message: "Failed to process recommendation request", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Sample nutrition topics
  app.get("/api/chat/topics", (_req: Request, res: Response) => {
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

  // Food entries routes
  app.use('/api/food-entries', foodEntriesRouter);

  // Nutrition goals routes
  app.use('/api/nutrition-goals', nutritionGoalsRouter);

  // Dashboard routes
  app.use('/api/dashboard', dashboardRouter);

  // Stats routes
  app.use('/api/stats', statsRouter);

  // User Profile routes
  app.use('/api/user-profile', userProfilesRouter);

  // Health check route
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

}
