import express from 'express';
import mongoose from 'mongoose';
import storage from '../storage';

const router = express.Router();

// Get dashboard data for a user
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const today = new Date();

    // Get today's food entries using MongoDB
    const todaysEntries = await storage.getDailyFoodEntries(
      new mongoose.Types.ObjectId(userId),
      today
    );

    // Calculate daily totals
    const dailyTotals = todaysEntries.reduce(
      (acc: any, entry: any) => ({
        calories: acc.calories + (entry.calories || 0),
        protein: acc.protein + (entry.protein || 0),
        carbs: acc.carbs + (entry.carbs || 0),
        fat: acc.fat + (entry.fat || 0),
        fiber: acc.fiber + (entry.fiber || 0),
        sugar: acc.sugar + (entry.sugar || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }
    );

    // Get user's nutrition goals
    const userGoals = await storage.getNutritionGoalByUserId(new mongoose.Types.ObjectId(userId));

    const defaultGoals = {
      calories: 2200,
      protein: 120,
      carbs: 275,
      fat: 73,
      fiber: 30,
      water: 2500,
    };

    // Map nutrition goal fields to the expected format
    const goals = userGoals ? {
      calories: userGoals.calorieGoal,
      protein: userGoals.proteinGoal,
      carbs: userGoals.carbGoal,
      fat: userGoals.fatGoal,
      fiber: 30, // Default since not in schema
      water: 2500, // Default since not in schema
    } : defaultGoals;

    // Calculate progress percentages
    const progress = {
      calories: Math.round((dailyTotals.calories / goals.calories) * 100),
      protein: Math.round((dailyTotals.protein / goals.protein) * 100),
      carbs: Math.round((dailyTotals.carbs / goals.carbs) * 100),
      fat: Math.round((dailyTotals.fat / goals.fat) * 100),
      fiber: Math.round((dailyTotals.fiber / goals.fiber) * 100),
    };

    // Get recent entries (last 10 entries)
    const recentEntries = await storage.getRecentFoodEntries(
      new mongoose.Types.ObjectId(userId),
      10
    );

    // Generate AI recommendations based on data
    const recommendations = generateRecommendations(dailyTotals, goals, progress);

    res.json({
      dailyTotals,
      goals,
      progress,
      recentEntries,
      recommendations,
      todaysEntries,
    });
  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Generate AI recommendations
function generateRecommendations(totals: any, goals: any, progress: any) {
  const recommendations = [];

  // Calorie recommendations
  if (progress.calories < 70) {
    recommendations.push({
      id: 1,
      type: 'nutrition',
      message: 'You\'re below your calorie target. Consider adding a healthy snack.',
      priority: 'medium',
    });
  } else if (progress.calories > 110) {
    recommendations.push({
      id: 2,
      type: 'nutrition',
      message: 'You\'ve exceeded your calorie target. Consider lighter options for your next meal.',
      priority: 'high',
    });
  }

  // Protein recommendations
  if (progress.protein < 60) {
    recommendations.push({
      id: 3,
      type: 'nutrition',
      message: 'Your protein intake is low. Consider adding lean protein sources.',
      priority: 'high',
    });
  }

  // Water recommendation (mock data)
  const waterIntake = Math.floor(Math.random() * 1000) + 1000; // Mock water intake
  if (waterIntake < goals.water * 0.7) {
    recommendations.push({
      id: 4,
      type: 'hydration',
      message: `You've only consumed ${waterIntake}ml of water today. Aim for ${goals.water}ml.`,
      priority: 'medium',
    });
  }

  // Exercise recommendation
  if (progress.calories > 80 && progress.calories < 110) {
    recommendations.push({
      id: 5,
      type: 'exercise',
      message: 'Great job hitting your calorie target! Time for a workout.',
      priority: 'low',
    });
  }

  return recommendations;
}

export default router;
