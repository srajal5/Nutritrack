import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "demo-key" });

// Analyze food entry and return nutritional information
export async function analyzeFoodEntry(
  foodName: string,
  description: string,
  servingSize: string
): Promise<{
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  analysis: string;
}> {
  try {
    const prompt = `
      Analyze the following food entry and provide nutritional information:
      Food Name: ${foodName}
      Description: ${description || "None provided"}
      Serving Size: ${servingSize}
      
      Please respond with a JSON object containing:
      1. calories: estimated calories (number)
      2. protein: grams of protein (number)
      3. carbs: grams of carbohydrates (number)
      4. fat: grams of fat (number)
      5. analysis: a brief analysis of this food's nutritional profile (string)
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content);

    return {
      calories: Number(result.calories),
      protein: Number(result.protein),
      carbs: Number(result.carbs),
      fat: Number(result.fat),
      analysis: result.analysis,
    };
  } catch (error) {
    console.error("Error analyzing food entry:", error);
    throw new Error("Failed to analyze food entry with AI");
  }
}

// Chat with AI about fitness and nutrition
export async function getFitnessResponse(
  userMessage: string,
  previousMessages: Array<{ role: "user" | "assistant"; content: string }> = []
): Promise<string> {
  try {
    const systemMessage = {
      role: "system",
      content: "You are an expert fitness and nutrition coach. Provide accurate, helpful, and motivating advice about fitness, nutrition, weight management, and healthy lifestyle habits. Base your responses on scientific evidence and best practices. Keep responses concise but informative."
    };

    const messages = [
      systemMessage,
      ...previousMessages,
      { role: "user", content: userMessage }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages as any, // TypeScript compatibility
      max_tokens: 500,
    });

    return response.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Error getting fitness response:", error);
    throw new Error("Failed to get fitness response from AI");
  }
}

// Get nutrition recommendations based on user's food entries
export async function getNutritionRecommendations(
  recentEntries: Array<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>,
  nutritionGoals: {
    calorieGoal: number;
    proteinGoal: number;
    carbGoal: number;
    fatGoal: number;
  }
): Promise<Array<{ title: string; description: string }>> {
  try {
    const prompt = `
      Based on the user's recent food entries and nutrition goals, provide 3 personalized recommendations for improving their diet.
      
      Recent Food Entries:
      ${recentEntries.map(entry => `${entry.name} - Calories: ${entry.calories}, Protein: ${entry.protein}g, Carbs: ${entry.carbs}g, Fat: ${entry.fat}g`).join('\n')}
      
      Nutrition Goals:
      Calories: ${nutritionGoals.calorieGoal}
      Protein: ${nutritionGoals.proteinGoal}g
      Carbs: ${nutritionGoals.carbGoal}g
      Fat: ${nutritionGoals.fatGoal}g
      
      Please provide the recommendations in JSON format with an array of objects, each having:
      1. title - A short title for the recommendation
      2. description - A brief explanation of the recommendation
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result.recommendations || [];
  } catch (error) {
    console.error("Error getting nutrition recommendations:", error);
    return [
      { 
        title: "Balance Your Meals", 
        description: "Try to include protein, healthy fats, and complex carbohydrates in each meal for better nutritional balance."
      },
      {
        title: "Stay Hydrated",
        description: "Drink plenty of water throughout the day to support metabolism and overall health."
      },
      {
        title: "Add More Vegetables",
        description: "Increase your vegetable intake to get more micronutrients and fiber in your diet."
      }
    ];
  }
}
