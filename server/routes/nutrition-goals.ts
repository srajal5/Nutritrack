import { Router } from 'express';
import { ensureAuthenticated } from '../middleware';
import storage from '../storage';
import { z } from 'zod';

const router = Router();

// Get nutrition goals
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const goals = await storage.getNutritionGoalByUserId(userId);
    if (!goals) {
      // Return default goals if none set
      return res.json({
        calorieGoal: 2100,
        proteinGoal: 120,
        carbGoal: 230,
        fatGoal: 70
      });
    }

    res.json(goals);
  } catch (error) {
    console.error('Error fetching nutrition goals:', error);
    res.status(500).json({ error: 'Failed to fetch nutrition goals' });
  }
});

// Update nutrition goals
const nutritionGoalsSchema = z.object({
  calorieGoal: z.number().min(0),
  proteinGoal: z.number().min(0),
  carbGoal: z.number().min(0),
  fatGoal: z.number().min(0)
});

router.put('/', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const validatedData = nutritionGoalsSchema.parse(req.body);
    const goals = await storage.setNutritionGoal({
      ...validatedData,
      userId: userId
    });
    
    res.json(goals);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid nutrition goals data', details: error.errors });
    }
    console.error('Error updating nutrition goals:', error);
    res.status(500).json({ error: 'Failed to update nutrition goals' });
  }
});

export default router; 