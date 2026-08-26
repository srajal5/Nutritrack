import { Router } from "express";
import { ensureAuthenticated } from "../middleware.js";
import storage from "../storage.js";
import { generatePersonalizedPlan } from "../openai.js";
import { calculateBackendNutritionTargets } from "../nutrition-calculator.js";

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

// Update the user's profile & save personalized nutrition plan
router.put("/", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const body = req.body || {};
    
    // Normalize goal identifiers from manual or AI structures
    const primaryGoal = body.goal?.primaryGoal || body.goal?.primary || 'MAINTAIN_WEIGHT';
    const secondaryGoals = Array.isArray(body.goal?.secondaryGoals) 
      ? body.goal.secondaryGoals 
      : (Array.isArray(body.goal?.secondary) ? body.goal.secondary : []);

    // Extract profile stats
    const age = Number(body.profile?.age) || 30;
    const gender = body.profile?.gender || 'male';
    const heightCm = Number(body.profile?.heightCm) || 170;
    const weightKg = Number(body.profile?.weightKg) || 70;
    const targetWeightKg = Number(body.profile?.targetWeightKg) || weightKg;
    const activityLevelStr = typeof body.profile?.activityLevel === 'string' ? body.profile.activityLevel : 'MODERATE';
    const activityLevel = activityLevelStr.toUpperCase();

    const fitnessLevelStr = typeof body.profile?.fitnessLevel === 'string' ? body.profile.fitnessLevel : 'BEGINNER';
    const fitnessLevel = fitnessLevelStr.toUpperCase();

    // Workout details
    const daysPerWeek = Number(body.workout?.daysPerWeek) || 3;
    const location = body.workout?.location || 'HOME';
    const equipment = Array.isArray(body.workout?.equipment) ? body.workout.equipment : [];

    // Compute backend nutrition targets deterministically
    const calculatedTargets = calculateBackendNutritionTargets({
      age,
      weightKg,
      heightCm,
      gender,
      activityLevel,
      goal: primaryGoal
    });

    const calorieTarget = Number(body.nutrition?.calorieTarget) || calculatedTargets.calorieTarget;
    const proteinTarget = Number(body.nutrition?.proteinTarget) || calculatedTargets.proteinTarget;

    // Normalize AI plan fields
    const summary = body.plan?.summary || body.aiPlan?.summary || body.planSummary || 'Personalized Nutrition & Training Plan';
    const weeklyWorkoutPlan = body.plan?.weeklyWorkoutPlan || body.aiPlan?.weeklyWorkoutPlan || body.workoutGuidance || [];
    const nutritionGuidelines = body.plan?.nutritionGuidelines || body.aiPlan?.nutritionGuidelines || body.recommendations || [];

    const normalizedProfileData = {
      isCompleted: true,
      profile: {
        age,
        gender,
        heightCm,
        weightKg,
        targetWeightKg,
        activityLevel,
        fitnessLevel
      },
      goal: {
        primaryGoal,
        secondaryGoals,
        desiredOutcome: body.goal?.desiredOutcome || ''
      },
      workout: {
        daysPerWeek,
        location,
        equipment
      },
      nutrition: {
        dietaryPreference: body.nutrition?.dietaryPreference || 'NO_RESTRICTION',
        allergies: body.nutrition?.allergies || [],
        dislikedFoods: body.nutrition?.dislikedFoods || [],
        preferredFoods: body.nutrition?.preferredFoods || [],
        calorieTarget,
        proteinTarget
      },
      aiPlan: {
        summary,
        weeklyWorkoutPlan,
        nutritionGuidelines,
        dailyTargets: {
          calories: calorieTarget,
          protein: proteinTarget,
          carbs: calculatedTargets.carbTarget,
          fat: calculatedTargets.fatTarget,
          water: calculatedTargets.waterTarget
        }
      }
    };

    let updatedProfile = await storage.updateUserProfile(userId, normalizedProfileData as any);

    // Sync NutritionGoal table in DB for fast queries
    await storage.setNutritionGoal({
      userId,
      calorieGoal: calorieTarget,
      proteinGoal: proteinTarget,
      carbGoal: calculatedTargets.carbTarget,
      fatGoal: calculatedTargets.fatTarget,
      fiberGoal: 25,
      sugarGoal: 50
    } as any);

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

    const existingProfile = await storage.getUserProfile(req.user!.id);
    const userContext = {
      ...existingProfile?.profile,
      goal: existingProfile?.goal,
      ...context
    };

    const aiPlan = await generatePersonalizedPlan(prompt, userContext);
    res.json(aiPlan);
  } catch (error) {
    console.error("Error generating AI plan:", error);
    res.status(500).json({ message: "Failed to generate AI plan" });
  }
});

export default router;
