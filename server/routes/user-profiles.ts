import { Router } from "express";
import { ZodError } from "zod";
import { ensureAuthenticated } from "../middleware.js";
import storage from "../storage.js";
import {
  buildPlan,
  saveProfileAndPlan,
  onboardingSchema,
  readPlanFromProfile,
  findMissingProfileFields,
  PlanValidationError,
} from "../plan-service.js";
import { interpretGoalText } from "../nutrition-calculator.js";

const router = Router();

/** Get the user's profile plus the plan the dashboard will read. */
router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    let profile: any = await storage.getUserProfile(userId);
    if (profile && typeof profile.toObject === 'function') profile = profile.toObject();

    if (!profile) return res.json(null);

    res.json({
      ...profile,
      // Same object the dashboard consumes, so the two pages can never disagree.
      resolvedPlan: readPlanFromProfile(profile),
      missingFields: findMissingProfileFields(profile),
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Failed to fetch user profile" });
  }
});

/**
 * Complete onboarding: validate -> calculate -> AI narrative -> persist -> respond.
 * The response is only sent after the write succeeds, so the client can safely
 * redirect to the dashboard the moment it resolves.
 */
router.put("/", ensureAuthenticated, async (req, res) => {
  const userId = req.user!.id;
  try {
    const parsed = onboardingSchema.parse(req.body);

    const plan = await buildPlan(parsed);
    let saved: any = await saveProfileAndPlan(userId, parsed, plan);
    if (saved && typeof saved.toObject === 'function') saved = saved.toObject();

    return res.json({
      success: true,
      onboardingCompleted: true,
      plan,
      profile: saved,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const missingFields = error.issues.map((i) => i.path.join('.'));
      return res.status(400).json({
        message:
          'To create an accurate personalized plan, please provide your age, height, weight, biological sex, activity level and goal.',
        code: 'INCOMPLETE_PROFILE',
        missingFields,
        issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    if (error instanceof PlanValidationError) {
      return res.status(400).json({
        message: error.message,
        code: 'INCOMPLETE_PROFILE',
        missingFields: error.missingFields,
      });
    }
    console.error("Error updating user profile:", error);
    return res.status(500).json({ message: "Failed to save your plan", code: 'SERVER_ERROR' });
  }
});

/**
 * Interpret a free-text goal without committing anything. Returns the mapped
 * goal so the onboarding form can pre-select it; the user stays in control and
 * still supplies the measurements themselves.
 */
router.post("/interpret-goal", ensureAuthenticated, async (req, res) => {
  try {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!text) return res.status(400).json({ message: "Describe your goal first.", code: 'MISSING_TEXT' });

    const interpreted = interpretGoalText(text);
    return res.json({
      interpretedGoal: interpreted,
      // The form still collects measurements; the AI never fills them in.
      requiresProfileData: true,
      message: interpreted
        ? `Understood — setting this up as a ${interpreted.replace(/_/g, ' ').toLowerCase()} plan.`
        : "Couldn't map that to a specific goal — please pick the closest one below.",
    });
  } catch (error) {
    console.error("Error interpreting goal:", error);
    return res.status(500).json({ message: "Failed to interpret goal" });
  }
});

export default router;
