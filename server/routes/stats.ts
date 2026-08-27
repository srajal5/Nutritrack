import { Router } from "express";
import { ensureAuthenticated } from "../middleware.js";
import storage from "../storage.js";
import { getAIStatsInsights } from "../openai.js";
import { getOrRefresh } from "../ai-cache.js";

const router = Router();

router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const userId = req.user.id;

    // Targets come from the user's persisted plan or not at all. Substituting
    // a stand-in 2000/150 here is what made unrelated users' stats look alike.
    const nutritionGoals = await storage.getNutritionGoalByUserId(userId);
    if (!nutritionGoals) {
      return res.status(404).json({
        message: 'No nutrition plan yet. Complete onboarding to see your stats.',
        code: 'NO_PLAN',
      });
    }

    // Generate last 7 days data
    interface DaySummary { date: string; fullDate: string; calories: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number; }
    const nutritionData: DaySummary[] = [];
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

    // Insights are an enhancement, never a blocker. Awaiting the model here made
    // the Stats page take 15s+ and time out. Serve empty immediately and warm
    // the cache in the background, exactly as the dashboard does.
    const insightsKey = `stats:${userId}:${nutritionData.map((d) => Math.round(d.calories / 100)).join('-')}`;
    const aiInsights = getOrRefresh(
      insightsKey,
      { insights: [], achievements: [] } as any,
      () => getAIStatsInsights(nutritionData, nutritionGoals as any),
    );

    // Format the goals for the frontend
    const formattedGoals = [
      {
        id: '1',
        name: 'Daily Calories',
        target: nutritionGoals.calorieGoal,
        current: nutritionData[6].calories, // Today's calories
        unit: 'cal',
        category: 'nutrition',
        deadline: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
      },
      {
        id: '2',
        name: 'Protein Intake',
        target: nutritionGoals.proteinGoal,
        current: nutritionData[6].protein,
        unit: 'g',
        category: 'nutrition',
        deadline: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
      },
      {
        id: '3',
        name: 'Carbs Target',
        target: nutritionGoals.carbGoal,
        current: nutritionData[6].carbs,
        unit: 'g',
        category: 'nutrition',
        deadline: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
      },
      {
        id: '4',
        name: 'Fat Limit',
        target: nutritionGoals.fatGoal,
        current: nutritionData[6].fat,
        unit: 'g',
        category: 'nutrition',
        deadline: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
      },
      {
        id: '5',
        name: 'Fiber Goal',
        target: nutritionGoals.fiberGoal,
        current: nutritionData[6].fiber,
        unit: 'g',
        category: 'nutrition',
        deadline: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
      },
      {
        id: '6',
        name: 'Sugar Limit',
        target: nutritionGoals.sugarGoal,
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
