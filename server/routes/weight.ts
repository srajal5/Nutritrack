import { Router } from 'express';
import { ensureAuthenticated } from '../middleware.js';
import storage from '../storage.js';

const router = Router();

/** The user's own weight history, newest first. */
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const entries = await storage.getWeightEntries(userId);
    res.setHeader('Cache-Control', 'no-store');
    res.json(
      entries.map((e: any) => ({
        id: e.id,
        weightKg: e.weightKg,
        recordedAt: new Date(e.recordedAt).toISOString(),
      })),
    );
  } catch (error) {
    console.error('Error fetching weight history:', error);
    res.status(500).json({ message: 'Failed to fetch weight history' });
  }
});

/**
 * Record a weight measurement. Also updates the profile's current weight, since
 * the plan's calorie target is derived from it — otherwise the dashboard would
 * show a new weight against targets computed from the old one.
 */
router.post('/', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const weightKg = Number(req.body?.weightKg);

    if (!Number.isFinite(weightKg) || weightKg < 30 || weightKg > 300) {
      return res.status(400).json({
        message: 'Enter a weight between 30 and 300 kg.',
        code: 'INVALID_WEIGHT',
      });
    }

    const entry = await storage.addWeightEntry(userId, weightKg);

    const profile: any = await storage.getUserProfile(userId);
    if (profile) {
      const plain = typeof profile.toObject === 'function' ? profile.toObject() : profile;
      await storage.updateUserProfile(userId, {
        profile: { ...plain.profile, weightKg },
      } as any);
    }

    res.status(201).json({
      id: (entry as any).id,
      weightKg: (entry as any).weightKg,
      recordedAt: new Date((entry as any).recordedAt).toISOString(),
      // Flag so the client knows to refresh anything derived from weight.
      profileUpdated: !!profile,
    });
  } catch (error) {
    console.error('Error recording weight:', error);
    res.status(500).json({ message: 'Failed to record weight' });
  }
});

export default router;
