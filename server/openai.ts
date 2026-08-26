import OpenAI from "openai";
import config from "./config.js";

// Use centralized config
const AI_MODEL = config.ai.model;
const FALLBACK_MODEL = config.ai.fallbackModel;

console.log(`🤖 AI Model configured: ${AI_MODEL}`);
console.log(`🤖 Fallback model: ${FALLBACK_MODEL}`);

const openai = new OpenAI({
  baseURL: config.ai.baseUrl,
  apiKey: config.ai.apiKey,
  defaultHeaders: {
    "HTTP-Referer": config.ai.referer,
    "X-Title": config.ai.title,
  }
});

// Add a check to warn if using a dummy key
if (!process.env.OPENROUTER_API_KEY) {
  console.warn('⚠️ WARNING: OPENROUTER_API_KEY is not set. AI features will not work.');
  console.warn('⚠️ Please set the OPENROUTER_API_KEY environment variable in your .env file.');
} else {
  console.log('✅ OPENROUTER_API_KEY is configured.');
}

/**
 * Safely extract text content from an OpenRouter/OpenAI API response.
 * Handles missing/malformed responses gracefully.
 */
function extractContent(response: any): string | null {
  try {
    if (!response) return null;
    // Handle both OpenAI and some OpenRouter response formats
    const choices = response.choices || (response.data && response.data.choices);
    if (!choices || !Array.isArray(choices) || choices.length === 0) return null;
    const firstChoice = choices[0];
    if (!firstChoice) return null;
    if (firstChoice.message) return firstChoice.message.content || null;
    if (firstChoice.text) return firstChoice.text || null;
    return null;
  } catch (err) {
    console.error('Error extracting content from AI response:', err);
    return null;
  }
}

/**
 * Safely parse JSON from AI model outputs.
 * Handles raw JSON, markdown code blocks (```json ... ```), bracketed arrays, braced objects, and conversational text.
 */
function safeJsonParse<T = any>(content: string): T {
  if (!content || typeof content !== 'string') {
    throw new Error('Empty or invalid response from AI model');
  }

  const trimmed = content.trim();

  // 1. Direct JSON parse
  try {
    return JSON.parse(trimmed);
  } catch {}

  // 2. Extract from markdown code block ```json ... ``` or ``` ... ```
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }

  // 3. Extract bracketed array if present
  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try {
      return JSON.parse(trimmed.substring(firstBracket, lastBracket + 1));
    } catch {}
  }

  // 4. Extract braced object if present
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(trimmed.substring(firstBrace, lastBrace + 1));
    } catch {}
  }

  // 5. Fallback regex patterns
  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {}
  }

  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {}
  }

  throw new Error('Could not parse JSON from AI response');
}

/**
 * Call the OpenRouter API with automatic fallback to a secondary model.
 */
async function callWithFallback(params: any): Promise<string> {
  // Try the primary model first
  try {
    const response = await openai.chat.completions.create({
      ...params,
      model: params.model || AI_MODEL,
    });
    const content = extractContent(response);
    if (content) return content;
    console.warn(`⚠️ Primary model (${AI_MODEL}) returned empty content. Trying fallback...`);
  } catch (primaryError: any) {
    console.warn(`⚠️ Primary model (${AI_MODEL}) failed: ${primaryError?.message || primaryError}. Trying fallback...`);
  }

  // Fallback to secondary model
  try {
    // Remove response_format for fallback as not all models support it
    const { response_format, ...fallbackParams } = params;
    const response = await openai.chat.completions.create({
      ...fallbackParams,
      model: FALLBACK_MODEL,
    });
    const content = extractContent(response);
    if (content) return content;
    throw new Error('Fallback model also returned empty content');
  } catch (fallbackError: any) {
    console.error(`❌ Both primary and fallback models failed. Fallback error: ${fallbackError?.message || fallbackError}`);
    throw new Error('All AI models failed to respond');
  }
}

// Enhanced system message for better fitness coaching
const ENHANCED_FITNESS_SYSTEM_MESSAGE = `You are an expert fitness and nutrition coach with deep knowledge of exercise science, nutrition, and behavior change. Your role is to provide:

1. **Personalized Guidance**: Tailor advice to individual goals, fitness levels, and preferences
2. **Step-by-Step Instructions**: Provide clear, actionable steps for implementation
3. **Evidence-Based Recommendations**: Base all advice on scientific research and best practices
4. **Motivational Support**: Encourage and inspire while being realistic about expectations
5. **Safety First**: Always prioritize safety and injury prevention
6. **Progressive Approach**: Suggest gradual improvements rather than drastic changes

**Response Structure:**
- Start with a brief, encouraging acknowledgment
- Provide specific, actionable advice
- Include step-by-step instructions when applicable
- Add safety considerations and modifications
- End with follow-up questions or next steps

**Key Areas of Expertise:**
- **Nutrition**: Meal planning, macronutrient balance, timing, supplements
- **Exercise**: Strength training, cardio, flexibility, mobility, recovery
- **Lifestyle**: Sleep, stress management, habit formation, consistency
- **Goal Setting**: SMART goals, progress tracking, motivation strategies

**Tone:**
- Professional yet friendly
- Encouraging but realistic
- Educational and informative
- Supportive and non-judgmental

Always ask clarifying questions when needed to provide more personalized advice.`;

// Analyze food entry and return nutritional information
export async function analyzeFoodEntry(
  foodName: string,
  description: string,
  servingSize: string,
  imageBase64?: string
): Promise<{
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  analysis: string;
  ingredients?: string[];
  healthBenefits?: string[];
  possibleAllergens?: string[];
}> {
  try {
    const promptTemplate = `
      Analyze the following food entry and provide detailed nutritional information:
      Food Name: ${foodName}
      Description: ${description || "None provided"}
      Serving Size: ${servingSize}
      
      Please respond with a JSON object containing:
      1. calories: estimated calories (number)
      2. protein: grams of protein (number)
      3. carbs: grams of carbohydrates (number)
      4. fat: grams of fat (number)
      5. fiber: grams of fiber (number)
      6. sugar: grams of sugar (number)
      7. analysis: a brief analysis of this food's nutritional profile (string)
      8. ingredients: an array of likely ingredients in this food (array of strings)
      9. healthBenefits: an array of potential health benefits from this food (array of strings)
      10. possibleAllergens: an array of potential allergens in this food (array of strings)
    `;

    let messages;

    if (imageBase64) {
      // If image is provided, use vision capabilities
      const base64Image = imageBase64.split(",")[1] || imageBase64; 

      messages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${promptTemplate}\n\nI've provided an image of this food. Please analyze the image to improve your nutritional assessment.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ];
    } else {
      // Text-only analysis
      messages = [{ role: "user", content: promptTemplate }];
    }

    const content = await callWithFallback({
      model: AI_MODEL,
      messages: messages as any,
    });

    if (!content) {
      return getFoodNutrientsFallback(foodName);
    }

    const result = safeJsonParse(content);

    return {
      calories: Number(result.calories) || 0,
      protein: Number(result.protein) || 0,
      carbs: Number(result.carbs) || 0,
      fat: Number(result.fat) || 0,
      fiber: Number(result.fiber) || 0,
      sugar: Number(result.sugar) || 0,
      analysis: result.analysis || "Analysis provided by AI",
      ingredients: Array.isArray(result.ingredients) ? result.ingredients : [],
      healthBenefits: Array.isArray(result.healthBenefits) ? result.healthBenefits : [],
      possibleAllergens: Array.isArray(result.possibleAllergens) ? result.possibleAllergens : [],
    };
  } catch (error) {
    console.warn("AI analysis failed, using fallback values:", error);
    return getFoodNutrientsFallback(foodName);
  }
}

/**
 * Fallback nutritional values based on food category when AI fails
 */
export function getFoodNutrientsFallback(foodName: string) {
  const nameLower = foodName.toLowerCase();
  
  // Define fallback categories
  const isProtein = nameLower.includes("chicken") || nameLower.includes("beef") || nameLower.includes("fish") ||
    nameLower.includes("protein") || nameLower.includes("yogurt") || nameLower.includes("egg") || nameLower.includes("meat");
  
  const isCarbFood = nameLower.includes("rice") || nameLower.includes("pasta") || nameLower.includes("bread") ||
    nameLower.includes("potato") || nameLower.includes("oats") || nameLower.includes("cereal") || nameLower.includes("grain");
  
  const isFruitFood = nameLower.includes("apple") || nameLower.includes("banana") || nameLower.includes("berry") ||
    nameLower.includes("fruit") || nameLower.includes("orange") || nameLower.includes("grape");
  
  const isVegFood = nameLower.includes("salad") || nameLower.includes("vegetable") || nameLower.includes("broccoli") || 
    nameLower.includes("spinach") || nameLower.includes("carrot");

  const isDessert = nameLower.includes("cake") || nameLower.includes("cookie") || nameLower.includes("chocolate") || 
    nameLower.includes("sweet") || nameLower.includes("ice cream");

  if (isProtein) {
    return {
      calories: 250, protein: 25, carbs: 5, fat: 15, fiber: 2, sugar: 1,
      analysis: "Estimated based on common protein sources.",
      ingredients: [foodName],
      healthBenefits: ["High protein for muscle repair"],
      possibleAllergens: isProtein && (nameLower.includes("egg") || nameLower.includes("yogurt")) ? ["Dairy", "Eggs"] : []
    };
  } else if (isCarbFood) {
    return {
      calories: 200, protein: 5, carbs: 40, fat: 1, fiber: 3, sugar: 2,
      analysis: "Estimated based on common carbohydrate sources.",
      ingredients: [foodName],
      healthBenefits: ["Good source of energy"],
      possibleAllergens: nameLower.includes("bread") || nameLower.includes("pasta") ? ["Gluten"] : []
    };
  } else if (isFruitFood) {
    return {
      calories: 100, protein: 1, carbs: 25, fat: 0, fiber: 4, sugar: 18,
      analysis: "Estimated based on common fruits.",
      ingredients: [foodName],
      healthBenefits: ["High in vitamins and fiber"],
      possibleAllergens: []
    };
  } else if (isVegFood) {
    return {
      calories: 50, protein: 2, carbs: 10, fat: 0, fiber: 5, sugar: 2,
      analysis: "Estimated based on common vegetables.",
      ingredients: [foodName],
      healthBenefits: ["Rich in micronutrients and fiber"],
      possibleAllergens: []
    };
  } else if (isDessert) {
    return {
      calories: 400, protein: 4, carbs: 50, fat: 20, fiber: 1, sugar: 35,
      analysis: "Estimated based on common desserts.",
      ingredients: [foodName, "Sugar"],
      healthBenefits: ["Energy boost"],
      possibleAllergens: ["Sugar", "Dairy", "Gluten"]
    };
  } else {
    return {
      calories: 350, protein: 15, carbs: 30, fat: 15, fiber: 2, sugar: 5,
      analysis: "General nutritional estimate for an unknown food item.",
      ingredients: [foodName],
      healthBenefits: ["Balanced meal component"],
      possibleAllergens: []
    };
  }
}

// Enhanced chat with AI about fitness and nutrition
export async function getFitnessResponse(
  userMessage: string,
  previousMessages: Array<{ role: "user" | "assistant"; content: string }> = [],
  userContext?: {
    fitnessLevel?: string;
    goals?: string[];
    dietaryRestrictions?: string[];
    availableTime?: string;
    equipment?: string[];
  }
): Promise<{
  response: string;
  actionItems: string[];
  followUpQuestions: string[];
  category: string;
  confidence: number;
}> {
  try {
    const contextPrompt = userContext ? `
User Context:
- Fitness Level: ${userContext.fitnessLevel || 'Not specified'}
- Goals: ${userContext.goals?.join(', ') || 'Not specified'}
- Dietary Restrictions: ${userContext.dietaryRestrictions?.join(', ') || 'None'}
- Available Time: ${userContext.availableTime || 'Not specified'}
- Equipment: ${userContext.equipment?.join(', ') || 'None'}

Please use this context to provide more personalized advice.
` : '';

    const systemMessage = {
      role: "system",
      content: `${ENHANCED_FITNESS_SYSTEM_MESSAGE}

${contextPrompt}

Please structure your response to include:
1. A helpful, personalized answer to the user's question
2. 3-5 specific action items they can implement
3. 2-3 follow-up questions to better understand their needs
4. The category of advice (nutrition, workout, lifestyle, recovery, planning)
5. Your confidence level (0-1) in the advice given

Respond in a conversational, encouraging tone while being specific and actionable.`
    };

    const messages = [
      systemMessage,
      ...previousMessages,
      { role: "user", content: userMessage }
    ];

    const content = await callWithFallback({
      model: AI_MODEL,
      messages: messages as any,
      max_tokens: 800,
      temperature: 0.7
    });

    // Parse the response to extract structured information
    const lines = content.split('\n');
    let mainResponse = '';
    let actionItems: string[] = [];
    let followUpQuestions: string[] = [];
    let category = 'general';
    let confidence = 0.8;

    let currentSection = 'response';

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.toLowerCase().includes('action items:') || trimmedLine.toLowerCase().includes('steps:')) {
        currentSection = 'actionItems';
        continue;
      } else if (trimmedLine.toLowerCase().includes('follow-up questions:') || trimmedLine.toLowerCase().includes('next steps:')) {
        currentSection = 'followUp';
        continue;
      } else if (trimmedLine.toLowerCase().includes('category:') || trimmedLine.toLowerCase().includes('type:')) {
        const categoryMatch = trimmedLine.match(/category:\s*(.+)/i) || trimmedLine.match(/type:\s*(.+)/i);
        if (categoryMatch) {
          category = categoryMatch[1].toLowerCase();
        }
        continue;
      } else if (trimmedLine.toLowerCase().includes('confidence:')) {
        const confidenceMatch = trimmedLine.match(/confidence:\s*([0-9.]+)/i);
        if (confidenceMatch) {
          confidence = parseFloat(confidenceMatch[1]);
        }
        continue;
      }

      if (trimmedLine && !trimmedLine.startsWith('---')) {
        if (currentSection === 'response') {
          mainResponse += (mainResponse ? '\n' : '') + trimmedLine;
        } else if (currentSection === 'actionItems' && (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.match(/^\d+\./))) {
          const item = trimmedLine.replace(/^[•\-\d\.\s]+/, '').trim();
          if (item) actionItems.push(item);
        } else if (currentSection === 'followUp' && (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.match(/^\d+\./))) {
          const question = trimmedLine.replace(/^[•\-\d\.\s]+/, '').trim();
          if (question) followUpQuestions.push(question);
        }
      }
    }

    // Fallback action items and questions if not found in response
    if (actionItems.length === 0) {
      actionItems = [
        "Start with small, manageable changes",
        "Track your progress consistently",
        "Stay consistent with your routine"
      ];
    }

    if (followUpQuestions.length === 0) {
      followUpQuestions = [
        "What specific goals would you like to focus on?",
        "What challenges are you currently facing?"
      ];
    }

    // Determine category if not specified
    if (category === 'general') {
      const input = userMessage.toLowerCase();
      if (input.includes('workout') || input.includes('exercise') || input.includes('training')) {
        category = 'workout';
      } else if (input.includes('nutrition') || input.includes('diet') || input.includes('meal') || input.includes('protein')) {
        category = 'nutrition';
      } else if (input.includes('sleep') || input.includes('recovery') || input.includes('rest')) {
        category = 'lifestyle';
      } else if (input.includes('goal') || input.includes('plan')) {
        category = 'planning';
      }
    }

    return {
      response: mainResponse || content,
      actionItems: actionItems.slice(0, 5),
      followUpQuestions: followUpQuestions.slice(0, 3),
      category,
      confidence
    };
  } catch (error) {
    console.error("Error getting fitness response:", error);

    // Handle specific error types
    let fallbackMessage = "I'd love to help you with that! To provide the most personalized advice, could you tell me more about your specific goals and current situation?";

    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as any).status;
      if (status === 429) {
        fallbackMessage = "I'm experiencing high demand right now. Let me provide some general guidance while I get back to full capacity. What specific fitness or nutrition question do you have?";
      } else if (status >= 500) {
        fallbackMessage = "I'm having technical difficulties at the moment. Let me give you some general advice while I work on getting back to full functionality.";
      }
    }

    // Fallback response
    return {
      response: fallbackMessage,
      actionItems: [
        "Share your fitness goals",
        "Describe your current routine",
        "Mention any challenges you're facing"
      ],
      followUpQuestions: [
        "What are your main fitness goals?",
        "What's your current fitness level?",
        "How much time can you dedicate to fitness?"
      ],
      category: 'general',
      confidence: 0.5
    };
  }
}

// Enhanced nutrition recommendations based on user's food entries
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
): Promise<Array<{
  title: string;
  description: string;
  actionItems: string[];
  priority: 'high' | 'medium' | 'low';
  category: string;
}>> {
  try {
    const prompt = `
      Based on the user's recent food entries and nutrition goals, provide 4 personalized recommendations for improving their diet.
      
      Recent Food Entries:
      ${recentEntries.map(entry => `${entry.name} - Calories: ${entry.calories}, Protein: ${entry.protein}g, Carbs: ${entry.carbs}g, Fat: ${entry.fat}g`).join('\n')}
      
      Nutrition Goals:
      Calories: ${nutritionGoals.calorieGoal}
      Protein: ${nutritionGoals.proteinGoal}g
      Carbs: ${nutritionGoals.carbGoal}g
      Fat: ${nutritionGoals.fatGoal}g
      
      Please provide the recommendations in JSON format with an array of objects, each having:
      1. title - A short, actionable title
      2. description - A detailed explanation of the recommendation
      3. actionItems - An array of 3-5 specific steps to implement
      4. priority - "high", "medium", or "low" based on impact
      5. category - "nutrition", "meal-planning", "timing", or "supplements"
      
      Focus on practical, implementable advice that addresses specific gaps in their current nutrition.
    `;

    const content = await callWithFallback({
      model: AI_MODEL,
      messages: [{ role: "user", content: prompt }],
    });

    const parsed = safeJsonParse(content);
    let list: any[] = [];
    if (Array.isArray(parsed)) {
      list = parsed;
    } else if (parsed && Array.isArray(parsed.recommendations)) {
      list = parsed.recommendations;
    } else if (parsed && Array.isArray(parsed.data)) {
      list = parsed.data;
    }

    if (list.length > 0) {
      return list.map(item => ({
        title: String(item.title || "Nutrition Advice"),
        description: String(item.description || "Improve your daily nutrition balance."),
        actionItems: Array.isArray(item.actionItems) ? item.actionItems.map(String) : ["Track meals consistently"],
        priority: (['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium') as 'high' | 'medium' | 'low',
        category: String(item.category || 'nutrition')
      }));
    }

    throw new Error('No recommendations array found in AI response');
  } catch (error) {
    console.error("Error getting nutrition recommendations:", error);

    // Log specific error details for debugging
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as any).status;
      if (status === 429) {
        console.log("OpenAI rate limit exceeded - using fallback recommendations");
      } else if (status >= 500) {
        console.log("OpenAI service error - using fallback recommendations");
      }
    }

    return [
      {
        title: "Optimize Protein Distribution",
        description: "Spread your protein intake evenly throughout the day for better muscle synthesis and satiety.",
        actionItems: [
          "Aim for 20-30g protein per meal",
          "Include protein in every snack",
          "Consider protein timing around workouts"
        ],
        priority: "high",
        category: "nutrition"
      },
      {
        title: "Improve Meal Timing",
        description: "Time your meals and snacks strategically to support your energy levels and recovery.",
        actionItems: [
          "Eat within 1 hour of waking",
          "Have a balanced meal 2-3 hours before workouts",
          "Include protein and carbs within 30 minutes after exercise"
        ],
        priority: "medium",
        category: "timing"
      },
      {
        title: "Enhance Meal Variety",
        description: "Increase the variety of foods in your diet to ensure you're getting all necessary nutrients.",
        actionItems: [
          "Try one new food each week",
          "Include different colored vegetables daily",
          "Rotate protein sources throughout the week"
        ],
        priority: "medium",
        category: "nutrition"
      },
      {
        title: "Track and Adjust",
        description: "Monitor your nutrition intake and adjust based on your progress and goals.",
        actionItems: [
          "Log your meals consistently",
          "Review your weekly nutrition summary",
          "Adjust portions based on progress"
        ],
        priority: "low",
        category: "meal-planning"
      }
    ];
  }
}

// Generate AI insights and achievements for the Stats page based on actual data
export async function getAIStatsInsights(
  aggregatedData: any[],
  nutritionGoals: any
): Promise<{
  insights: string;
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
  }>;
}> {
  try {
    const prompt = `
      Based on the user's aggregated daily nutrition data for the past 7 days and their nutrition goals, generate a brief analytical insight and 4 personalized achievements they have unlocked.
      
      Aggregated Data (last 7 days):
      ${JSON.stringify(aggregatedData, null, 2)}
      
      Nutrition Goals:
      Calories: ${nutritionGoals.calorieGoal}
      Protein: ${nutritionGoals.proteinGoal}g
      Carbs: ${nutritionGoals.carbGoal}g
      Fat: ${nutritionGoals.fatGoal}g
      
      Please provide the response in JSON format exactly like this:
      {
        "insights": "A 2-3 sentence analytical insight about their recent trends, recognizing successes and suggesting areas to watch.",
        "achievements": [
          {
            "id": "1",
            "name": "Short Catchy Name",
            "description": "Why they got it based on the data",
            "icon": "Choose one: Award, Target, Clock, Flame, Zap, Apple, Droplet, Activity",
            "color": "Choose one: text-yellow-500, text-blue-500, text-green-500, text-red-500, text-purple-500, text-orange-500"
          }
        ]
      }
      
      Ensure you return exactly 4 achievements. Be encouraging but base it strictly on the provided data.
    `;

    const content = await callWithFallback({
      model: AI_MODEL,
      messages: [{ role: "user", content: prompt }],
    });

    const result = safeJsonParse(content);
    return {
      insights: result.insights || "Keep tracking your meals to see more insights!",
      achievements: Array.isArray(result.achievements) ? result.achievements : []
    };
  } catch (error) {
    console.error("Error getting AI stats insights:", error);

    // Fallback response
    return {
      insights: "You're making steady progress. Keep logging your daily meals to see more detailed trends and unlock personalized achievements!",
      achievements: [
        { id: '1', name: 'Consistent Tracker', description: 'You are viewing your stats!', icon: 'Award', color: 'text-yellow-500' },
        { id: '2', name: 'Goal Setter', description: 'You have active nutrition goals.', icon: 'Target', color: 'text-blue-500' },
        { id: '3', name: 'Data Explorer', description: 'Taking time to understand your habits.', icon: 'Activity', color: 'text-purple-500' },
        { id: '4', name: 'Health Journey', description: 'Committed to better nutrition.', icon: 'Flame', color: 'text-red-500' }
      ]
    };
  }
}

export async function generatePersonalizedPlan(userRequest: string, userContext?: any) {
  const prompt = `
You are an expert AI fitness and nutrition coach.
The user wants to set up a personalized fitness and nutrition plan.
Here is their natural language request: "${userRequest}"

${userContext ? `Here is the user's existing profile context: ${JSON.stringify(userContext)}` : ''}

Your task is to extract the relevant information and generate a structured plan.
If critical information (like current weight, height, or specific goals) is completely missing and impossible to deduce, you may include followUpQuestions. Otherwise, do your best to formulate a reasonable plan.

Return the response STRICTLY as a JSON object matching this schema:
{
  "isComplete": boolean, // false if you desperately need more info to make a safe plan
  "followUpQuestion": string | null, // ask for missing info if isComplete is false
  "goal": {
    "primary": "LOSE_WEIGHT" | "GAIN_WEIGHT" | "BUILD_MUSCLE" | "MAINTAIN_WEIGHT" | "IMPROVE_FITNESS" | "IMPROVE_STRENGTH" | "IMPROVE_NUTRITION" | "GENERAL_HEALTH",
    "secondary": string[]
  },
  "profile": {
    "age": number | null,
    "heightCm": number | null,
    "weightKg": number | null,
    "targetWeightKg": number | null,
    "activityLevel": "SEDENTARY" | "LIGHT" | "MODERATE" | "ACTIVE" | "VERY_ACTIVE",
    "fitnessLevel": "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
  },
  "workout": {
    "daysPerWeek": number,
    "location": "HOME" | "GYM" | "OUTDOORS" | "MIXED",
    "equipment": string[]
  },
  "nutrition": {
    "dietaryPreference": "NO_RESTRICTION" | "VEGETARIAN" | "VEGAN" | "EGGETARIAN" | "NON_VEGETARIAN" | "PESCATARIAN",
    "proteinTarget": number,
    "calorieTarget": number
  },
  "plan": {
    "summary": string,
    "weeklyWorkoutPlan": string[],
    "nutritionGuidelines": string[]
  }
}
`;

  try {
    const content = await callWithFallback({
      model: AI_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2, // Low temp for structured data extraction
    });

    return safeJsonParse(content);
  } catch (error) {
    console.error("Error generating personalized plan:", error);
    throw error;
  }
}
