import { db } from "./db";
import { foodEntries, nutritionGoals, users } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seedDatabase() {
  console.log("Seeding database with initial data...");
  
  try {
    // Check if we already have users
    const existingUsers = await db.select({ count: { count: users.id } }).from(users);
    if (existingUsers[0].count > 0) {
      console.log("Database already has data. Skipping seed.");
      return;
    }
    
    // Create test user
    const [testUser] = await db.insert(users).values({
      username: "testuser",
      password: await hashPassword("password123")
    }).returning();
    
    console.log(`Created test user with ID: ${testUser.id}`);
    
    // Create nutrition goals
    await db.insert(nutritionGoals).values({
      userId: testUser.id,
      calorieGoal: 2100,
      proteinGoal: 120,
      carbGoal: 230,
      fatGoal: 70
    });
    
    console.log("Created nutrition goals for test user");
    
    // Create sample food entries
    await db.insert(foodEntries).values([
      {
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
      },
      {
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
      },
      {
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
      },
      {
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
      }
    ]);
    
    console.log("Created sample food entries");
    
    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Error during database seeding:", error);
  }
}

// Run seeding
seedDatabase();