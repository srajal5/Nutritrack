import { Router } from 'express';
import { ensureAuthenticated } from '../middleware';
import storage from '../storage';
import { z } from 'zod';
import { FoodEntryDocument } from '../storage';

const router = Router();

// Get daily food entries summary
router.get('/daily', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const entries = await storage.getFoodEntriesByUserId(userId);
    const todaysEntries = entries.filter((entry: FoodEntryDocument) => {
      const entryDate = new Date(entry.entryDate);
      return entryDate >= today && entryDate < tomorrow;
    });

    const nutritionGoal = await storage.getNutritionGoalByUserId(userId);

    const summary = {
      totalCalories: todaysEntries.reduce((sum: number, entry: FoodEntryDocument) => sum + (entry.calories || 0), 0),
      protein: todaysEntries.reduce((sum: number, entry: FoodEntryDocument) => sum + (entry.protein || 0), 0),
      carbs: todaysEntries.reduce((sum: number, entry: FoodEntryDocument) => sum + (entry.carbs || 0), 0),
      fat: todaysEntries.reduce((sum: number, entry: FoodEntryDocument) => sum + (entry.fat || 0), 0),
      remainingCalories: (nutritionGoal?.calorieGoal || 0) - todaysEntries.reduce((sum: number, entry: FoodEntryDocument) => sum + (entry.calories || 0), 0)
    };

    res.json(summary);
  } catch (error) {
    console.error('Error fetching daily summary:', error);
    res.status(500).json({ error: 'Failed to fetch daily summary' });
  }
});

// Get weekly food entries
router.get('/weekly', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 6); // Last 7 days
    startOfWeek.setHours(0, 0, 0, 0);

    const entries = await storage.getFoodEntriesByUserId(userId);
    const weeklyEntries = entries.filter((entry: FoodEntryDocument) => {
      const entryDate = new Date(entry.entryDate);
      return entryDate >= startOfWeek;
    });

    // Group entries by date
    const dailyCalories = new Array(7).fill(0);
    weeklyEntries.forEach((entry: FoodEntryDocument) => {
      const entryDate = new Date(entry.entryDate);
      const dayIndex = 6 - Math.floor((today.getTime() - entryDate.getTime()) / (24 * 60 * 60 * 1000));
      if (dayIndex >= 0 && dayIndex < 7) {
        dailyCalories[dayIndex] += entry.calories || 0;
      }
    });

    const weeklyData = dailyCalories.map((calories, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      return {
        date: date.toISOString(),
        calories
      };
    });

    res.json(weeklyData);
  } catch (error) {
    console.error('Error fetching weekly data:', error);
    res.status(500).json({ error: 'Failed to fetch weekly data' });
  }
});

// Get recent food entries
router.get('/recent', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const entries = await storage.getFoodEntriesByUserId(userId);
    const recentEntries = entries
      .sort((a: FoodEntryDocument, b: FoodEntryDocument) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
      .slice(0, 5)
      .map((entry: FoodEntryDocument) => ({
        id: entry.id,
        name: entry.name,
        calories: entry.calories,
        entryDate: entry.entryDate
      }));

    res.json(recentEntries);
  } catch (error) {
    console.error('Error fetching recent entries:', error);
    res.status(500).json({ error: 'Failed to fetch recent entries' });
  }
});

// Add new food entry
const foodEntrySchema = z.object({
  name: z.string(),
  servingSize: z.string(),
  mealType: z.string(),
  calories: z.number().optional(),
  protein: z.number().optional(),
  carbs: z.number().optional(),
  fat: z.number().optional(),
  fiber: z.number().optional(),
  sugar: z.number().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional()
});

router.post('/', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const validatedData = foodEntrySchema.parse(req.body);
    const entry = await storage.createFoodEntry({
      ...validatedData,
      userId: userId,
      entryDate: new Date()
    });

    res.status(201).json(entry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid food entry data', details: error.errors });
    }
    console.error('Error adding food entry:', error);
    res.status(500).json({ error: 'Failed to add food entry' });
  }
});

export default router; 