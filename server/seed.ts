import { connectDB } from "./db";
// eslint-disable-next-line @typescript-eslint/no-unused-vars

import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import storage from "./storage";
import { User, FoodEntry, NutritionGoal } from "./models";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Function to check if a user exists using both storage and models
async function checkUserExists(username: string) {
  // Using storage
  const existingUser = await storage.getUserByUsername(username);
  if (existingUser) return true;

  // Using model directly as backup
  const modelUser = await User.findOne({ username });
  return modelUser !== null;
}

// Function to create a user using both storage and models
async function createUserWithStorage(userData: {
  username: string;
  password: string;
  email: string;
  displayName: string;
}) {
  const hashedPassword = await hashPassword(userData.password);
  
  // First try with storage
  try {
    return await storage.createUser({
      ...userData,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  } catch (error) {
    console.log("Falling back to direct model creation");
    // Fallback to direct model creation
    const user = new User({
      ...userData,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return await user.save();
  }
}

// Function to create nutrition goals using both storage and models
async function createNutritionGoalsWithStorage(userId: number, goals: {
  calorieGoal: number;
  proteinGoal: number;
  carbGoal: number;
  fatGoal: number;
}) {
  // First try with storage
  try {
    return await storage.createNutritionGoal({
      userId,
      ...goals,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  } catch (error) {
    console.log("Falling back to direct model creation");
    // Fallback to direct model creation
    const nutritionGoal = new NutritionGoal({
      userId,
      ...goals,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return await nutritionGoal.save();
  }
}

// Function to create food entries using both storage and models
async function createFoodEntryWithStorage(entryData: {
  userId: number;
  name: string;
  description: string;
  servingSize: string;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl?: string;
  entryDate: Date;
  aiAnalysis?: string;
}) {
  // First try with storage
  try {
    return await storage.createFoodEntry({
      ...entryData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  } catch (error) {
    console.log("Falling back to direct model creation");
    // Fallback to direct model creation
    const foodEntry = new FoodEntry({
      ...entryData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return await foodEntry.save();
  }
}

async function seedDatabase() {
  console.log("Seeding database with initial data...");
  
  try {
    // Connect to the database
    await connectDB();
    
    // Check if we already have users using both methods
    const userExists = await checkUserExists("testuser");
    if (userExists) {
      console.log("Database already has data. Skipping seed.");
      return;
    }
    
    // Create test user using both methods
    const testUser = await createUserWithStorage({
      username: "testuser",
      password: "password123",
      email: "test@example.com",
      displayName: "Test User"
    });
    
    console.log(`Created test user with ID: ${testUser.id}`);
    
    // Create nutrition goals using both methods
    await createNutritionGoalsWithStorage(testUser.id, {
      calorieGoal: 2100,
      proteinGoal: 120,
      carbGoal: 230,
      fatGoal: 70
    });
    
    console.log("Created nutrition goals for test user");
    
    // Create sample food entries using both methods
    await createFoodEntryWithStorage({
      userId: testUser.id,
      name: "Greek Yogurt Bowl",
      description: "With berries and honey",
      servingSize: "1 bowl",
      mealType: "breakfast",
      calories: 380,
      protein: 15,
      carbs: 45,
      fat: 12,
      imageUrl: "https://images.unsplash.com/photo-1505253758473-96b7015fcd40?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80",
      entryDate: new Date(),
      aiAnalysis: "Greek yogurt is an excellent source of protein and probiotics. The berries add antioxidants and fiber, while honey provides natural sweetness."
    });

    await createFoodEntryWithStorage({
      userId: testUser.id,
      name: "Grilled Chicken Salad",
      description: "With olive oil dressing",
      servingSize: "1 plate",
      mealType: "lunch",
      calories: 420,
      protein: 35,
      carbs: 20,
      fat: 22,
      imageUrl: "https://images.unsplash.com/photo-1503200831604-6f3d55b2770d?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80",
      entryDate: new Date(),
      aiAnalysis: "Grilled chicken is a lean protein source. The salad provides fiber and micronutrients, while olive oil adds healthy monounsaturated fats."
    });

    await createFoodEntryWithStorage({
      userId: testUser.id,
      name: "Protein Shake",
      description: "With banana and almond milk",
      servingSize: "1 shake",
      mealType: "snack",
      calories: 220,
      protein: 25,
      carbs: 20,
      fat: 5,
      imageUrl: "https://images.unsplash.com/photo-1590779033100-9f60a05a013d?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80",
      entryDate: new Date(),
      aiAnalysis: "This shake is high in protein, making it an excellent post-workout option. The banana adds potassium and natural sweetness, while almond milk provides vitamin E."
    });

    await createFoodEntryWithStorage({
      userId: testUser.id,
      name: "Grilled Salmon with Vegetables",
      description: "With roasted sweet potatoes",
      servingSize: "1 serving",
      mealType: "dinner",
      calories: 520,
      protein: 40,
      carbs: 30,
      fat: 25,
      imageUrl: "https://images.unsplash.com/photo-1580013759032-c96505e24c1f?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80",
      entryDate: new Date(),
      aiAnalysis: "Salmon is rich in omega-3 fatty acids which are beneficial for heart health. Sweet potatoes provide complex carbs and vitamin A, while the vegetables add fiber and micronutrients."
    });
    
    console.log("Created sample food entries");
    
    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Error during database seeding:", error);
  }
}

// Run seeding
seedDatabase();