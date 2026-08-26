import express from 'express';
import storage from '../storage.js';
import { ensureAuthenticated } from '../middleware.js';
import { getNutritionRecommendations } from '../openai.js';
import { calculateBackendNutritionTargets } from '../nutrition-calculator.js';

const router = express.Router();

// Get dashboard data for a user
router.get('/:userId', ensureAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;
    const authenticatedUserId = req.user?.id;

    // Security check: only allow users to see their own dashboard
    if (authenticatedUserId && Number(userId) !== authenticatedUserId) {
      return res.status(403).json({ error: 'Not authorized to view this dashboard' });
    }

    const today = new Date();

    // Get today's food entries using MongoDB
    const todaysEntries = await storage.getDailyFoodEntries(
      Number(userId),
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

    // Get user's nutrition goals & profile
    let userGoals = await storage.getNutritionGoalByUserId(Number(userId));
    const userProfile = await storage.getUserProfile(Number(userId));

    // If user profile exists but nutrition goals are missing, compute & persist them
    if (!userGoals && userProfile) {
      const calculated = calculateBackendNutritionTargets({
        age: userProfile.profile?.age,
        weightKg: userProfile.profile?.weightKg,
        heightCm: userProfile.profile?.heightCm,
        gender: userProfile.profile?.gender,
        activityLevel: userProfile.profile?.activityLevel,
        goal: userProfile.goal?.primaryGoal
      });

      userGoals = await storage.setNutritionGoal({
        userId: Number(userId),
        calorieGoal: userProfile.nutrition?.calorieTarget || calculated.calorieTarget,
        proteinGoal: userProfile.nutrition?.proteinTarget || calculated.proteinTarget,
        carbGoal: calculated.carbTarget,
        fatGoal: calculated.fatTarget,
        fiberGoal: 25,
        sugarGoal: 50
      } as any);
    }

    // Default target calculations if user has no profile or goals yet
    const fallbackTargets = calculateBackendNutritionTargets({
      age: 30,
      weightKg: 70,
      heightCm: 170,
      gender: 'male',
      activityLevel: 'MODERATE',
      goal: 'MAINTAIN_WEIGHT'
    });

    const waterTarget = userProfile?.profile?.weightKg 
      ? Math.round(userProfile.profile.weightKg * 35) 
      : fallbackTargets.waterTarget;

    const goals = {
      calories: userGoals?.calorieGoal || userProfile?.nutrition?.calorieTarget || fallbackTargets.calorieTarget,
      protein: userGoals?.proteinGoal || userProfile?.nutrition?.proteinTarget || fallbackTargets.proteinTarget,
      carbs: userGoals?.carbGoal || fallbackTargets.carbTarget,
      fat: userGoals?.fatGoal || fallbackTargets.fatTarget,
      fiber: userGoals?.fiberGoal || 25,
      water: waterTarget,
    };

    // Calculate progress percentages
    const progress = {
      calories: goals.calories > 0 ? Math.round((dailyTotals.calories / goals.calories) * 100) : 0,
      protein: goals.protein > 0 ? Math.round((dailyTotals.protein / goals.protein) * 100) : 0,
      carbs: goals.carbs > 0 ? Math.round((dailyTotals.carbs / goals.carbs) * 100) : 0,
      fat: goals.fat > 0 ? Math.round((dailyTotals.fat / goals.fat) * 100) : 0,
      fiber: goals.fiber > 0 ? Math.round((dailyTotals.fiber / goals.fiber) * 100) : 0,
    };

    // Get recent entries (last 10 entries)
    const recentEntries = await storage.getRecentFoodEntries(
      Number(userId),
      10
    );

    // Generate personalized AI recommendations based on actual data
    let recommendations;
    try {
      const aiRecommendations = await getNutritionRecommendations(
        recentEntries.map(e => ({
          name: e.name,
          calories: e.calories || 0,
          protein: e.protein || 0,
          carbs: e.carbs || 0,
          fat: e.fat || 0
        })),
        {
          calorieGoal: goals.calories,
          proteinGoal: goals.protein,
          carbGoal: goals.carbs,
          fatGoal: goals.fat
        }
      );
      
      recommendations = aiRecommendations.map((rec, index) => ({
        id: index + 1,
        type: rec.category === 'hydration' ? 'hydration' : (rec.category === 'exercise' ? 'exercise' : 'nutrition'),
        message: `${rec.title}: ${rec.description}`,
        priority: rec.priority,
        actionItems: rec.actionItems
      }));
    } catch (aiError) {
      console.warn("AI recommendations failed, using rule-based fallback:", aiError);
      recommendations = generateFallbackRecommendations(goals, progress);
    }

    res.json({
      dailyTotals,
      goals,
      progress,
      recentEntries,
      recommendations,
      todaysEntries,
      profile: userProfile,
    });
  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Generate fallback rule-based recommendations
function generateFallbackRecommendations(_goals: any, progress: any) {
  const recommendations = [];

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

  if (progress.protein < 60) {
    recommendations.push({
      id: 3,
      type: 'nutrition',
      message: 'Your protein intake is low. Consider adding lean protein sources.',
      priority: 'high',
    });
  }

  return recommendations;
}

export default router;
