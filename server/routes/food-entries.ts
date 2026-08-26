import { Router } from 'express';
import { ensureAuthenticated } from '../middleware.js';
import storage, { FoodEntryDocument } from '../storage.js';
import { z } from 'zod';
import { analyzeFoodEntry } from '../openai.js';

const router = Router();

// Get ALL food entries for the user
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const entries = await storage.getFoodEntriesByUserId(userId);
    res.json(entries || []);
  } catch (error) {
    console.error('Error fetching food entries:', error);
    res.status(500).json({ error: 'Failed to fetch food entries' });
  }
});

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
      const entryDate = new Date(entry.entryDate || entry.createdAt);
      return entryDate >= today && entryDate < tomorrow;
    });

    const nutritionGoal = await storage.getNutritionGoalByUserId(userId);

    const summary = {
      totalCalories: todaysEntries.reduce((sum: number, entry: FoodEntryDocument) => sum + (entry.calories || 0), 0),
      protein: todaysEntries.reduce((sum: number, entry: FoodEntryDocument) => sum + (entry.protein || 0), 0),
      carbs: todaysEntries.reduce((sum: number, entry: FoodEntryDocument) => sum + (entry.carbs || 0), 0),
      fat: todaysEntries.reduce((sum: number, entry: FoodEntryDocument) => sum + (entry.fat || 0), 0),
      fiber: todaysEntries.reduce((sum: number, entry: FoodEntryDocument) => sum + (entry.fiber || 0), 0),
      sugar: todaysEntries.reduce((sum: number, entry: FoodEntryDocument) => sum + (entry.sugar || 0), 0),
      remainingCalories: (nutritionGoal?.calorieGoal || 2000) - todaysEntries.reduce((sum: number, entry: FoodEntryDocument) => sum + (entry.calories || 0), 0)
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
    today.setHours(23, 59, 59, 999);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 6); // Last 7 days
    startOfWeek.setHours(0, 0, 0, 0);

    const entries = await storage.getFoodEntriesByUserId(userId);
    const weeklyEntries = entries.filter((entry: FoodEntryDocument) => {
      const entryDate = new Date(entry.entryDate || entry.createdAt);
      return entryDate >= startOfWeek && entryDate <= today;
    });

    // Group entries by date
    const dailyCalories = new Array(7).fill(0);
    const now = new Date();
    weeklyEntries.forEach((entry: FoodEntryDocument) => {
      const entryDate = new Date(entry.entryDate || entry.createdAt);
      const dayIndex = 6 - Math.floor((now.getTime() - entryDate.getTime()) / (24 * 60 * 60 * 1000));
      if (dayIndex >= 0 && dayIndex < 7) {
        dailyCalories[dayIndex] += entry.calories || 0;
      }
    });

    const weeklyData = dailyCalories.map((calories, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - index));
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
      .sort((a: FoodEntryDocument, b: FoodEntryDocument) => new Date(b.entryDate || b.createdAt).getTime() - new Date(a.entryDate || a.createdAt).getTime())
      .slice(0, 5)
      .map((entry: FoodEntryDocument) => ({
        id: entry.id,
        name: entry.name,
        calories: entry.calories,
        entryDate: entry.entryDate || entry.createdAt
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

const analysisSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  servingSize: z.string(),
  imageUrl: z.string().optional()
});

router.post('/analyze', ensureAuthenticated, async (req, res) => {
  try {
    const validatedData = analysisSchema.parse(req.body);
    const analysis = await analyzeFoodEntry(
      validatedData.name,
      validatedData.description || "",
      validatedData.servingSize,
      validatedData.imageUrl
    );

    res.json({
      ...analysis,
      confidence: 85, // Default confidence for AI analysis
      suggestions: [
        ...(analysis.healthBenefits || []),
        ...(analysis.possibleAllergens?.length ? [`Contains potential allergens: ${analysis.possibleAllergens.join(', ')}`] : [])
      ]
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid analysis data', details: error.errors });
    }
    console.error('Error analyzing food:', error);
    res.status(500).json({ error: 'Failed to analyze food' });
  }
});

router.post('/', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const validatedData = foodEntrySchema.parse(req.body);

    let finalData = { ...validatedData };

    // If nutrition values are missing or zero, try AI analysis with fallback
    if (!finalData.calories && !finalData.protein && !finalData.carbs && !finalData.fat) {
      try {
        const analysis = await analyzeFoodEntry(
          finalData.name,
          finalData.description || "",
          finalData.servingSize,
          finalData.imageUrl
        );

        finalData.calories = analysis.calories;
        finalData.protein = analysis.protein;
        finalData.carbs = analysis.carbs;
        finalData.fat = analysis.fat;
        finalData.fiber = analysis.fiber;
        finalData.sugar = analysis.sugar;
      } catch (aiError) {
        console.warn("AI analysis failed, using fallback values:", aiError);
        const analysis = await import('../openai.js').then(m => m.getFoodNutrientsFallback(finalData.name));
        finalData.calories = analysis.calories;
        finalData.protein = analysis.protein;
        finalData.carbs = analysis.carbs;
        finalData.fat = analysis.fat;
        finalData.fiber = analysis.fiber;
        finalData.sugar = analysis.sugar;
      }
    }

    const entry = await storage.createFoodEntry({
      ...finalData,
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

// Delete a food entry
router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const entryId = parseInt(req.params.id, 10);
    if (isNaN(entryId)) {
      return res.status(400).json({ error: 'Invalid entry ID' });
    }

    // Verify the entry belongs to this user
    const entry = await storage.getFoodEntryById(entryId);
    if (!entry) {
      return res.status(404).json({ error: 'Food entry not found' });
    }
    if (entry.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this entry' });
    }

    const deleted = await storage.deleteFoodEntry(entryId);
    if (deleted) {
      res.json({ message: 'Food entry deleted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to delete food entry' });
    }
  } catch (error) {
    console.error('Error deleting food entry:', error);
    res.status(500).json({ error: 'Failed to delete food entry' });
  }
});

export default router;