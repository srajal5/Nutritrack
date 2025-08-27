import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || 'sk-dummy-key-for-development' 
});

// Add a check to warn if using a dummy key
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ WARNING: OPENAI_API_KEY is not set. Using a dummy key that will not work with OpenAI API.');
  console.warn('⚠️ Please set the OPENAI_API_KEY environment variable in your .env file.');
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
      5. analysis: a brief analysis of this food's nutritional profile (string)
      6. ingredients: an array of likely ingredients in this food (array of strings)
      7. healthBenefits: an array of potential health benefits from this food (array of strings)
      8. possibleAllergens: an array of potential allergens in this food (array of strings)
    `;

    let messages;
    
    if (imageBase64) {
      // If image is provided, use vision capabilities
      const base64Image = imageBase64.split(",")[1]; // Remove data:image/jpeg;base64, prefix
      
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

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages as any,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }
    const result = JSON.parse(content);

    return {
      calories: Number(result.calories),
      protein: Number(result.protein),
      carbs: Number(result.carbs),
      fat: Number(result.fat),
      analysis: result.analysis,
      ingredients: result.ingredients || [],
      healthBenefits: result.healthBenefits || [],
      possibleAllergens: result.possibleAllergens || [],
    };
  } catch (error) {
    console.error("Error analyzing food entry:", error);
    throw new Error("Failed to analyze food entry with AI");
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

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages as any,
      max_tokens: 800,
      temperature: 0.7
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

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

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }
    const result = JSON.parse(content as string);
    return result.recommendations || [];
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
