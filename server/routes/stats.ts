import { Router } from "express";
import { ensureAuthenticated } from "../middleware";
import storage from "../storage";
import { getAIStatsInsights } from "../openai";

const router = Router();

router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const userId = req.user.id;

    // Fetch nutrition goals
    let nutritionGoals = await storage.getNutritionGoalByUserId(userId);
    if (!nutritionGoals) {
      // Default goals if none exist
      nutritionGoals = {
        userId,
        calorieGoal: 2000,
        proteinGoal: 150,
        carbGoal: 250,
        fatGoal: 65,
        fiberGoal: 25,
        sugarGoal: 50,
        id: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;
    }

    // Generate last 7 days data
    const nutritionData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const dailyEntries = await storage.getDailyFoodEntries(userId, date);
      
      const daySummary = {
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        fullDate: date.toISOString(),
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0
      };

      dailyEntries.forEach(entry => {
        daySummary.calories += entry.calories || 0;
        daySummary.protein += entry.protein || 0;
        daySummary.carbs += entry.carbs || 0;
        daySummary.fat += entry.fat || 0;
        daySummary.fiber += entry.fiber || 0;
        daySummary.sugar += entry.sugar || 0;
      });

      nutritionData.push(daySummary);
    }

    // Call OpenAI for insights and achievements
    const aiInsights = await getAIStatsInsights(nutritionData, nutritionGoals);

    // Format the goals for the frontend
    const formattedGoals = [
      {
        id: '1',
        name: 'Daily Calories',
        target: nutritionGoals?.calorieGoal ?? 2000,
        current: nutritionData[6].calories, // Today's calories
        unit: 'cal',
        category: 'nutrition',
        deadline: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
      },
      {
        id: '2',
        name: 'Protein Intake',
        target: nutritionGoals?.proteinGoal ?? 150,
        current: nutritionData[6].protein,
        unit: 'g',
        category: 'nutrition',
        deadline: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
      },
      {
        id: '3',
        name: 'Carbs Target',
        target: nutritionGoals?.carbGoal ?? 250,
        current: nutritionData[6].carbs,
        unit: 'g',
        category: 'nutrition',
        deadline: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
      },
      {
        id: '4',
        name: 'Fat Limit',
        target: nutritionGoals?.fatGoal ?? 65,
        current: nutritionData[6].fat,
        unit: 'g',
        category: 'nutrition',
        deadline: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
      },
      {
        id: '5',
        name: 'Fiber Goal',
        target: nutritionGoals?.fiberGoal ?? 25,
        current: nutritionData[6].fiber,
        unit: 'g',
        category: 'nutrition',
        deadline: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
      },
      {
        id: '6',
        name: 'Sugar Limit',
        target: nutritionGoals?.sugarGoal ?? 50,
        current: nutritionData[6].sugar,
        unit: 'g',
        category: 'nutrition',
        deadline: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
      }
    ];

    res.json({
      nutritionData,
      goals: formattedGoals,
      insights: aiInsights.insights,
      achievements: aiInsights.achievements
    });

  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ 
      message: "Failed to fetch stats", 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

export default router;
