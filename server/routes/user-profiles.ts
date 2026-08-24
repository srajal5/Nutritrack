import { Router } from "express";
import { ensureAuthenticated } from "../middleware";
import storage from "../storage";
import { generatePersonalizedPlan } from "../openai";

const router = Router();

// Get the user's profile
router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    let profile = await storage.getUserProfile(userId);
    
    // Convert Mongoose document to plain object
    if (profile && typeof profile.toObject === 'function') {
      profile = profile.toObject();
    }
    
    res.json(profile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Failed to fetch user profile" });
  }
});

// Update the user's profile
router.put("/", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const profileData = req.body;
    
    let updatedProfile = await storage.updateUserProfile(userId, profileData);
    
    // Sync with NutritionGoal if nutrition targets are provided
    if (updatedProfile.nutrition?.calorieTarget && updatedProfile.nutrition?.proteinTarget) {
      await storage.setNutritionGoal({
        userId,
        calorieGoal: updatedProfile.nutrition.calorieTarget,
        proteinGoal: updatedProfile.nutrition.proteinTarget,
        carbGoal: Math.round(updatedProfile.nutrition.calorieTarget * 0.4 / 4), // 40% carbs
        fatGoal: Math.round(updatedProfile.nutrition.calorieTarget * 0.3 / 9),  // 30% fat
        fiberGoal: 25,
        sugarGoal: 50
      } as any);
    }

    if (updatedProfile && typeof updatedProfile.toObject === 'function') {
      updatedProfile = updatedProfile.toObject();
    }

    res.json(updatedProfile);
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ message: "Failed to update user profile" });
  }
});

// Generate AI Plan
router.post("/generate-plan", ensureAuthenticated, async (req, res) => {
  try {
    const { prompt, context } = req.body;
    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    const aiPlan = await generatePersonalizedPlan(prompt, context);
    res.json(aiPlan);
  } catch (error) {
    console.error("Error generating AI plan:", error);
    res.status(500).json({ message: "Failed to generate AI plan" });
  }
});

export default router;
