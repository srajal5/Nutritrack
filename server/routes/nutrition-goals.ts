import { Router } from 'express';
import { ensureAuthenticated } from '../middleware.js';
import storage from '../storage.js';
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
      // No invented defaults. Handing back 2100/120/230/70 here is what made
      // unrelated users look identical; the client shows a "finish your plan"
      // prompt instead.
      return res.status(404).json({
        message: 'No nutrition plan yet. Complete onboarding to generate one.',
        code: 'NO_PLAN',
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
  fatGoal: z.number().min(0),
  fiberGoal: z.number().min(0),
  sugarGoal: z.number().min(0)
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