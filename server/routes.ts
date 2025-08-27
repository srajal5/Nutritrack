import type { Express, NextFunction, Request, Response } from "express";
import { createServer, type Server } from "http";
import storage, { type UserDocument, type FoodEntryInput, type NutritionGoalInput } from "./storage";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { setupAuth } from "./auth";
import { analyzeFoodEntry, getFitnessResponse, getNutritionRecommendations } from "./openai";
import foodEntriesRouter from './routes/food-entries';
import nutritionGoalsRouter from './routes/nutrition-goals';
import dashboardRouter from './routes/dashboard';

// Extend Express.Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: UserDocument;
    }
  }
}

// Middleware to ensure user is authenticated
export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  console.log('Auth check:', {
    isAuthenticated: req.isAuthenticated(),
    sessionID: req.sessionID,
    user: req.user,
    cookies: req.headers.cookie
  });
  
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Not authenticated" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // prefix all routes with /api
  
  // Food Entries API
  app.post("/api/food-entries", ensureAuthenticated, async (req, res) => {
    try {
      const { name, servingSize, mealType, description, calories, protein, carbs, fat, imageUrl } = req.body;
      
      // Ensure we have a valid user ID
      if (!req.user?.id) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Use the user's numeric ID directly
      const foodEntryData: FoodEntryInput = {
        userId: req.user.id, // Use the numeric ID
        name,
        servingSize: servingSize.toString(),
        mealType,
        description,
        calories: Number(calories),
        protein: Number(protein),
        carbs: Number(carbs),
        fat: Number(fat),
        imageUrl,
        entryDate: new Date()
      };
      
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
          
          const foodEntry = await storage.createFoodEntry({
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
        }
      }
      
      // Create the food entry with either AI analysis or fallback values
      const foodEntry = await storage.createFoodEntry(foodEntryData);
      res.status(201).json(foodEntry);
    } catch (error) {
      console.error("Error adding food entry:", error);
      res.status(500).json({ error: "Failed to add food entry" });
    }
  });

  app.get("/api/food-entries", ensureAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const foodEntries = await storage.getFoodEntriesByUserId(req.user.id);
      res.json(foodEntries || []);
    } catch (error) {
      console.error("Error fetching food entries:", error);
      res.status(500).json({ 
        message: "Failed to fetch food entries", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.get("/api/food-entries/daily", ensureAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const dateString = req.query.date as string;
      const date = dateString ? new Date(dateString) : new Date();
      
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      const dailyEntries = await storage.getDailyFoodEntries(req.user.id, date);
      res.json(dailyEntries || []);
    } catch (error) {
      console.error("Error fetching daily food entries:", error);
      res.status(500).json({ 
        message: "Failed to fetch daily food entries", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

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
      const formattedPreviousMessages = previousMessages.map(msg => ({
        role: msg.userId.toString() === userId.toString() ? "user" as const : "assistant" as const,
        content: msg.message
      }));

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
      res.json({
        ...chatMessage,
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
        fatGoal: Number(req.body.fatGoal)
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
          calorieGoal: 2000,
          proteinGoal: 150,
          carbGoal: 250,
          fatGoal: 65,
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

  // Health check route
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const httpServer = createServer(app);
  return httpServer;
}
