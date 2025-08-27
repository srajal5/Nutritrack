import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  MessageSquare, 
  Send, 
  Sparkles, 
  Target, 
  TrendingUp, 
  Zap, 
  Heart,
  Lightbulb,
  BookOpen,
  Calendar,
  Trophy,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  ArrowRight,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import BackButton from '@/components/BackButton';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'text' | 'recommendation' | 'workout' | 'instruction' | 'analysis';
  metadata?: {
    category?: string;
    actionItems?: string[];
    followUpQuestions?: string[];
    confidence?: number;
  };
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: 'nutrition' | 'workout' | 'lifestyle' | 'recovery';
  priority: 'high' | 'medium' | 'low';
  actionItems: string[];
  estimatedTime?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

interface UserProfile {
  goals: string[];
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
  dietaryRestrictions: string[];
  availableTime: string;
  equipment: string[];
}

export default function AICoach() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your AI fitness coach. I'm here to provide personalized nutrition advice, workout recommendations, and step-by-step guidance to help you achieve your health and fitness goals. Let me know what you'd like to work on today!",
      sender: 'ai',
      timestamp: new Date(),
      type: 'instruction',
      metadata: {
        category: 'welcome',
        actionItems: ['Set your fitness goals', 'Share your current routine', 'Ask about nutrition'],
        followUpQuestions: [
          "What are your main fitness goals?",
          "What's your current fitness level?",
          "Do you have any dietary restrictions?"
        ]
      }
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId] = useState(`conv_${Date.now()}`);
  const [activeTab, setActiveTab] = useState('chat');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Fetch user's nutrition data for personalized recommendations
  const { data: dailySummary } = useQuery({
    queryKey: ['/api/food-entries/daily'],
    enabled: !!user?.id,
  });

  const { data: nutritionGoals } = useQuery({
    queryKey: ['/api/nutrition-goals'],
    enabled: !!user?.id,
  });

  const { data: recommendations } = useQuery({
    queryKey: ['/api/recommendations'],
    enabled: !!user?.id,
  });

  // Enhanced recommendations with more detailed information
  const enhancedRecommendations: Recommendation[] = [
    {
      id: '1',
      title: 'Optimize Your Protein Intake',
      description: 'Based on your activity level and goals, you should aim for 1.2-1.6g of protein per kg of body weight daily. This will help with muscle building, recovery, and satiety.',
      category: 'nutrition',
      priority: 'high',
      actionItems: [
        'Add lean protein to every meal',
        'Include protein-rich snacks between meals',
        'Consider protein timing around workouts'
      ],
      estimatedTime: '5-10 minutes per meal',
      difficulty: 'beginner'
    },
    {
      id: '2',
      title: 'Implement Progressive Strength Training',
      description: 'Start with 2-3 strength training sessions per week focusing on compound movements. Gradually increase intensity and volume as you progress.',
      category: 'workout',
      priority: 'high',
      actionItems: [
        'Start with bodyweight exercises',
        'Learn proper form for basic movements',
        'Gradually add resistance training'
      ],
      estimatedTime: '45-60 minutes per session',
      difficulty: 'beginner'
    },
    {
      id: '3',
      title: 'Establish Consistent Sleep Routine',
      description: 'Quality sleep is crucial for recovery, muscle growth, and overall health. Aim for 7-9 hours of uninterrupted sleep per night.',
      category: 'lifestyle',
      priority: 'high',
      actionItems: [
        'Set a consistent bedtime',
        'Create a relaxing pre-sleep routine',
        'Optimize your sleep environment'
      ],
      estimatedTime: '30 minutes preparation',
      difficulty: 'beginner'
    },
    {
      id: '4',
      title: 'Improve Recovery and Mobility',
      description: 'Incorporate stretching, foam rolling, and mobility work to improve recovery and prevent injuries.',
      category: 'recovery',
      priority: 'medium',
      actionItems: [
        'Add 10-15 minutes of stretching daily',
        'Use foam roller for muscle recovery',
        'Practice mobility exercises'
      ],
      estimatedTime: '15-20 minutes daily',
      difficulty: 'beginner'
    }
  ];

  // Structured conversation starters
  const conversationStarters = [
    {
      category: 'Goals & Assessment',
      questions: [
        "What are your main fitness goals?",
        "What's your current fitness level?",
        "How much time can you dedicate to fitness?",
        "Do you have any injuries or limitations?"
      ]
    },
    {
      category: 'Nutrition Guidance',
      questions: [
        "Can you help me create a meal plan?",
        "What should I eat before/after workouts?",
        "How can I improve my nutrition?",
        "What supplements should I consider?"
      ]
    },
    {
      category: 'Workout Planning',
      questions: [
        "Can you design a workout routine for me?",
        "What exercises should I do today?",
        "How can I progress my workouts?",
        "What's the best way to build muscle?"
      ]
    },
    {
      category: 'Lifestyle & Recovery',
      questions: [
        "How can I improve my sleep quality?",
        "What's the best way to recover after workouts?",
        "How can I reduce stress?",
        "What lifestyle changes should I make?"
      ]
    }
  ];

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Enhanced AI chat mutation
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', '/api/chat', {
        message,
        conversationId,
        userContext: {
          fitnessLevel: 'intermediate', // This could be fetched from user profile
          goals: ['build muscle', 'improve nutrition'],
          dietaryRestrictions: [],
          availableTime: '1 hour daily',
          equipment: ['dumbbells', 'resistance bands']
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      const aiMessage: Message = {
        id: Date.now().toString(),
        text: data.response || generateEnhancedAIResponse(data.message),
        sender: 'ai',
        timestamp: new Date(),
        type: 'instruction',
        metadata: {
          category: data.category || determineMessageCategory(data.message),
          actionItems: data.actionItems || extractActionItems(data.response),
          followUpQuestions: data.followUpQuestions || generateFollowUpQuestions(data.message),
          confidence: data.confidence || 0.9
        }
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to get AI response. Please try again.',
        variant: 'destructive',
      });
      setIsTyping(false);
    }
  });

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    chatMutation.mutate(text);
  };

  const generateEnhancedAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('workout') || input.includes('exercise') || input.includes('routine')) {
      return `Great question! Let me help you create an effective workout routine. 

**Step-by-Step Workout Plan:**

1. **Warm-up (5-10 minutes):**
   - Light cardio (walking, jogging, cycling)
   - Dynamic stretches
   - Joint mobility exercises

2. **Main Workout (30-45 minutes):**
   - **Strength Training (3-4 days/week):**
     - Squats: 3 sets × 10-12 reps
     - Push-ups: 3 sets × 8-12 reps
     - Rows: 3 sets × 10-12 reps
     - Planks: 3 sets × 30-60 seconds

   - **Cardio (2-3 days/week):**
     - 20-30 minutes of moderate intensity
     - Walking, cycling, swimming, or running

3. **Cool-down (5-10 minutes):**
   - Static stretching
   - Deep breathing exercises

**Progression Tips:**
- Start with bodyweight exercises
- Gradually increase reps and sets
- Add resistance when exercises become easy
- Listen to your body and rest when needed

Would you like me to create a more specific routine based on your goals and available equipment?`;
    }
    
    if (input.includes('protein') || input.includes('muscle') || input.includes('build')) {
      return `Excellent question! Protein is crucial for muscle building and recovery.

**Protein Requirements:**
- **General:** 1.2-1.6g per kg of body weight daily
- **Muscle Building:** 1.6-2.2g per kg of body weight daily
- **Weight Loss:** 1.6-2.4g per kg of body weight daily

**Best Protein Sources:**
1. **Lean Meats:** Chicken breast, turkey, lean beef
2. **Fish:** Salmon, tuna, cod, tilapia
3. **Eggs:** Whole eggs (6-8g protein each)
4. **Dairy:** Greek yogurt, cottage cheese, milk
5. **Plant-based:** Tofu, tempeh, legumes, quinoa

**Protein Timing Strategy:**
- **Breakfast:** 20-30g protein
- **Lunch:** 25-35g protein
- **Dinner:** 25-35g protein
- **Snacks:** 10-20g protein
- **Post-workout:** 20-30g protein within 30 minutes

**Sample High-Protein Meal:**
- Grilled chicken breast (150g): 31g protein
- Quinoa (1 cup): 8g protein
- Broccoli (1 cup): 3g protein
- Greek yogurt (170g): 17g protein
**Total: 59g protein**

**Action Items:**
1. Calculate your daily protein needs
2. Plan protein-rich meals
3. Prepare protein snacks
4. Track your protein intake

Would you like me to help you create a specific meal plan to meet your protein goals?`;
    }
    
    if (input.includes('weight') || input.includes('lose') || input.includes('fat')) {
      return `Weight loss is about creating a sustainable calorie deficit while maintaining muscle mass.

**Weight Loss Strategy:**

**1. Calculate Your Needs:**
- **BMR (Basal Metabolic Rate):** Your body's energy needs at rest
- **TDEE (Total Daily Energy Expenditure):** BMR + activity level
- **Calorie Deficit:** 300-500 calories below TDEE for sustainable loss

**2. Nutrition Guidelines:**
- **Protein:** 1.6-2.4g per kg body weight (preserves muscle)
- **Fats:** 20-35% of total calories
- **Carbs:** Remaining calories (focus on complex carbs)
- **Fiber:** 25-30g daily for satiety

**3. Meal Planning Tips:**
- Eat protein with every meal
- Include plenty of vegetables
- Choose whole foods over processed
- Stay hydrated (8-10 glasses water daily)
- Practice portion control

**4. Exercise Recommendations:**
- **Strength Training:** 3-4 days/week (preserves muscle)
- **Cardio:** 150-300 minutes/week moderate intensity
- **NEAT:** Increase daily movement (walking, stairs)

**5. Lifestyle Factors:**
- **Sleep:** 7-9 hours nightly
- **Stress Management:** Practice relaxation techniques
- **Consistency:** Stick to your plan long-term

**Sample Weight Loss Meal Plan:**
- **Breakfast:** Greek yogurt + berries + nuts
- **Lunch:** Grilled chicken salad with vegetables
- **Dinner:** Salmon + quinoa + roasted vegetables
- **Snacks:** Apple + almond butter, protein shake

**Progress Tracking:**
- Weigh yourself weekly (same time, same conditions)
- Take progress photos monthly
- Measure body composition
- Track energy levels and performance

Would you like me to help you calculate your specific calorie needs and create a personalized plan?`;
    }
    
    if (input.includes('meal') || input.includes('eat') || input.includes('diet')) {
      return `Let me help you create a balanced, nutritious meal plan!

**Balanced Meal Structure:**

**1. Protein (25-30% of plate):**
- Lean meats, fish, eggs, dairy, legumes
- Aim for 20-30g protein per meal

**2. Complex Carbohydrates (25-30% of plate):**
- Whole grains, sweet potatoes, quinoa, brown rice
- Provides sustained energy

**3. Vegetables (40-50% of plate):**
- Leafy greens, colorful vegetables
- High in fiber, vitamins, and minerals

**4. Healthy Fats (small portion):**
- Avocado, nuts, olive oil, seeds
- Essential for hormone production and absorption

**Sample Meal Plans:**

**Breakfast Options:**
1. **Protein Bowl:** Greek yogurt + berries + granola + nuts
2. **Eggs & Toast:** Scrambled eggs + whole grain toast + avocado
3. **Smoothie:** Protein powder + banana + spinach + almond milk

**Lunch Options:**
1. **Chicken Salad:** Grilled chicken + mixed greens + quinoa + vegetables
2. **Buddha Bowl:** Brown rice + tofu + roasted vegetables + tahini dressing
3. **Turkey Wrap:** Whole grain wrap + turkey + vegetables + hummus

**Dinner Options:**
1. **Salmon & Veggies:** Baked salmon + roasted vegetables + sweet potato
2. **Stir Fry:** Lean beef + vegetables + brown rice + soy sauce
3. **Vegetarian:** Lentil curry + quinoa + vegetables

**Snack Ideas:**
- Apple + almond butter
- Greek yogurt + berries
- Protein shake
- Hummus + vegetables
- Mixed nuts

**Meal Prep Tips:**
1. Plan meals for the week
2. Cook proteins in bulk
3. Prepare vegetables in advance
4. Use portion control containers
5. Keep healthy snacks readily available

**Hydration:**
- Drink 8-10 glasses of water daily
- Add lemon or cucumber for flavor
- Monitor urine color (should be light yellow)

Would you like me to create a specific meal plan based on your goals, preferences, and dietary restrictions?`;
    }
    
    if (input.includes('sleep') || input.includes('recovery') || input.includes('rest')) {
      return `Sleep and recovery are essential for fitness progress and overall health!

**Sleep Optimization:**

**1. Sleep Requirements:**
- **Adults:** 7-9 hours per night
- **Athletes:** 8-10 hours per night
- **Quality:** Uninterrupted, deep sleep cycles

**2. Sleep Hygiene Practices:**
- **Consistent Schedule:** Same bedtime and wake time daily
- **Dark Environment:** Use blackout curtains, avoid blue light
- **Cool Temperature:** 65-68°F (18-20°C) optimal
- **Quiet Space:** Use white noise machine if needed

**3. Pre-Sleep Routine (30-60 minutes):**
- Turn off screens 1 hour before bed
- Read a book or listen to calming music
- Practice relaxation techniques (deep breathing, meditation)
- Take a warm bath or shower
- Avoid caffeine after 2 PM

**4. Recovery Strategies:**

**Active Recovery:**
- Light walking or cycling
- Stretching and mobility work
- Foam rolling and massage
- Yoga or tai chi

**Nutrition for Recovery:**
- **Post-workout:** Protein + carbs within 30 minutes
- **Evening:** Light meal 2-3 hours before bed
- **Hydration:** Drink water throughout the day
- **Supplements:** Consider magnesium for sleep

**5. Stress Management:**
- Practice mindfulness or meditation
- Journal your thoughts
- Spend time in nature
- Connect with loved ones
- Set boundaries with work and technology

**6. Sleep Tracking:**
- Use a sleep app or wearable device
- Monitor sleep quality and duration
- Track how you feel upon waking
- Adjust habits based on data

**Recovery Day Activities:**
- Light stretching or yoga
- Walking or gentle cycling
- Swimming or water activities
- Reading or creative hobbies
- Social activities with friends

**Signs of Poor Recovery:**
- Persistent fatigue
- Decreased performance
- Mood changes
- Increased injury risk
- Poor sleep quality

Would you like me to help you create a personalized sleep and recovery plan?`;
    }
    
    return `That's a great question! I'd love to help you with that. To provide the most personalized and accurate advice, could you tell me a bit more about:

**Your Current Situation:**
- What are your main fitness goals?
- What's your current fitness level?
- How much time can you dedicate to fitness?
- Do you have any injuries or limitations?

**Your Preferences:**
- What types of exercises do you enjoy?
- Do you have any dietary restrictions?
- What equipment do you have access to?
- What's your preferred workout environment?

**Your Challenges:**
- What's been preventing you from reaching your goals?
- What specific areas do you need help with?
- What motivates you to stay consistent?

Once I understand your situation better, I can provide:
- Personalized workout routines
- Customized nutrition plans
- Step-by-step action items
- Progress tracking strategies
- Motivation and accountability tips

What would you like to focus on first?`;
  };

  const determineMessageCategory = (message: string): string => {
    const input = message.toLowerCase();
    if (input.includes('workout') || input.includes('exercise')) return 'workout';
    if (input.includes('protein') || input.includes('nutrition') || input.includes('meal')) return 'nutrition';
    if (input.includes('sleep') || input.includes('recovery')) return 'lifestyle';
    if (input.includes('goal') || input.includes('plan')) return 'planning';
    return 'general';
  };

  const extractActionItems = (response: string): string[] => {
    const actionItems: string[] = [];
    const lines = response.split('\n');
    
    lines.forEach(line => {
      if (line.includes('•') || line.includes('-') || line.includes('1.') || line.includes('2.')) {
        const item = line.replace(/^[•\-\d\.\s]+/, '').trim();
        if (item && item.length > 10) {
          actionItems.push(item);
        }
      }
    });
    
    return actionItems.slice(0, 5); // Limit to 5 action items
  };

  const generateFollowUpQuestions = (message: string): string[] => {
    const input = message.toLowerCase();
    const questions: string[] = [];
    
    if (input.includes('workout')) {
      questions.push(
        "What equipment do you have access to?",
        "How many days per week can you work out?",
        "What's your current fitness level?"
      );
    } else if (input.includes('nutrition')) {
      questions.push(
        "Do you have any dietary restrictions?",
        "What are your main nutrition goals?",
        "How many meals do you prefer per day?"
      );
    } else {
      questions.push(
        "What are your main fitness goals?",
        "What's your current routine like?",
        "What challenges are you facing?"
      );
    }
    
    return questions.slice(0, 3);
  };

  const handleQuickQuestion = (question: string) => {
    sendMessage(question);
  };

  const handleRecommendationClick = (recommendation: Recommendation) => {
    const message = `Tell me more about: ${recommendation.title}`;
    sendMessage(message);
  };

  return (
    <div className="min-h-screen gradient-bg theme-transition">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-4 mb-4">
            <BackButton />
            <div className="p-3 rounded-full bg-primary/10">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">AI Fitness Coach</h1>
              <p className="text-muted-foreground">Your personalized nutrition and fitness assistant with step-by-step guidance</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
          {/* Chat Interface */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="card-shadow theme-transition h-[600px] flex flex-col">
                <CardHeader className="border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src="/ai-avatar.png" />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <Brain className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-foreground">AI Coach</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        {isTyping ? 'Analyzing your request...' : 'Ready to help'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 p-0">
                  <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[85%] ${message.sender === 'user' ? 'order-2' : 'order-1'}`}>
                            <div className={`p-4 rounded-lg ${
                              message.sender === 'user' 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted text-foreground'
                            }`}>
                              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                {message.text}
                              </div>
                              
                              {/* Action Items */}
                              {message.metadata?.actionItems && message.metadata.actionItems.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-border/50">
                                  <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <span className="text-xs font-medium">Action Items:</span>
                                  </div>
                                  <ul className="space-y-1">
                                    {message.metadata.actionItems.map((item, index) => (
                                      <li key={index} className="text-xs flex items-start gap-2">
                                        <span className="text-green-500 mt-1">•</span>
                                        <span>{item}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Follow-up Questions */}
                              {message.metadata?.followUpQuestions && message.metadata.followUpQuestions.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-border/50">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Lightbulb className="h-4 w-4 text-blue-500" />
                                    <span className="text-xs font-medium">Follow-up Questions:</span>
                                  </div>
                                  <div className="space-y-1">
                                    {message.metadata.followUpQuestions.map((question, index) => (
                                      <Button
                                        key={index}
                                        variant="outline"
                                        size="sm"
                                        className="h-auto p-2 text-xs justify-start"
                                        onClick={() => handleQuickQuestion(question)}
                                      >
                                        {question}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {message.timestamp.toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                          {message.sender === 'ai' && (
                            <Avatar className="h-8 w-8 ml-2 order-2">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                <Brain className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </motion.div>
                      ))}
                      
                      {isTyping && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex justify-start"
                        >
                          <div className="bg-muted p-4 rounded-lg">
                            <div className="flex items-center gap-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              </div>
                              <span className="text-sm text-muted-foreground">Analyzing your request...</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>

                <div className="p-4 border-t border-border/50">
                  <div className="flex gap-2">
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage(inputValue)}
                      placeholder="Ask me anything about nutrition, fitness, or health..."
                      className="flex-1"
                    />
                    <Button 
                      onClick={() => sendMessage(inputValue)}
                      disabled={!inputValue.trim() || isTyping}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Conversation Starters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="card-shadow theme-transition">
                <CardHeader>
                  <CardTitle className="text-foreground">Conversation Starters</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Get personalized guidance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="chat">Quick Chat</TabsTrigger>
                      <TabsTrigger value="topics">Topics</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="chat" className="space-y-2 mt-4">
                      {conversationStarters.slice(0, 2).map((category, index) => (
                        <div key={index} className="space-y-2">
                          <h4 className="text-sm font-medium text-foreground">{category.category}</h4>
                          {category.questions.slice(0, 2).map((question, qIndex) => (
                    <Button
                              key={qIndex}
                      variant="outline"
                      className="w-full justify-start text-left h-auto p-3"
                      onClick={() => handleQuickQuestion(question)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="text-sm">{question}</span>
                    </Button>
                  ))}
                        </div>
                      ))}
                    </TabsContent>
                    
                    <TabsContent value="topics" className="space-y-2 mt-4">
                      {conversationStarters.map((category, index) => (
                        <div key={index} className="space-y-2">
                          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                            {category.category === 'Goals & Assessment' && <Target className="h-4 w-4" />}
                            {category.category === 'Nutrition Guidance' && <Heart className="h-4 w-4" />}
                            {category.category === 'Workout Planning' && <TrendingUp className="h-4 w-4" />}
                            {category.category === 'Lifestyle & Recovery' && <Clock className="h-4 w-4" />}
                            {category.category}
                          </h4>
                          {category.questions.map((question, qIndex) => (
                            <Button
                              key={qIndex}
                              variant="outline"
                              className="w-full justify-start text-left h-auto p-3"
                              onClick={() => handleQuickQuestion(question)}
                            >
                              <ArrowRight className="h-4 w-4 mr-2 flex-shrink-0" />
                              <span className="text-sm">{question}</span>
                            </Button>
                          ))}
                        </div>
                      ))}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </motion.div>

            {/* AI Recommendations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="card-shadow theme-transition">
                <CardHeader>
                  <CardTitle className="text-foreground">Personalized Recommendations</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Based on your profile and goals
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {enhancedRecommendations.map((rec) => (
                    <motion.div
                      key={rec.id}
                      whileHover={{ scale: 1.02 }}
                      className="p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-all duration-300 cursor-pointer"
                      onClick={() => handleRecommendationClick(rec)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          rec.category === 'nutrition' ? 'bg-green-500/10' :
                          rec.category === 'workout' ? 'bg-blue-500/10' :
                          rec.category === 'lifestyle' ? 'bg-purple-500/10' :
                          'bg-orange-500/10'
                        }`}>
                          {rec.category === 'nutrition' && <Target className="h-4 w-4 text-green-500" />}
                          {rec.category === 'workout' && <TrendingUp className="h-4 w-4 text-blue-500" />}
                          {rec.category === 'lifestyle' && <Heart className="h-4 w-4 text-purple-500" />}
                          {rec.category === 'recovery' && <Clock className="h-4 w-4 text-orange-500" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-foreground text-sm">{rec.title}</h4>
                            <Badge 
                              variant={rec.priority === 'high' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {rec.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{rec.description}</p>
                          
                          {/* Action Items Preview */}
                          <div className="space-y-1">
                            {rec.actionItems.slice(0, 2).map((item, index) => (
                              <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                          
                          {/* Metadata */}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {rec.estimatedTime && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {rec.estimatedTime}
                              </span>
                            )}
                            {rec.difficulty && (
                              <Badge variant="outline" className="text-xs">
                                {rec.difficulty}
                              </Badge>
                            )}
                        </div>
                      </div>
                    </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Progress Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="card-shadow theme-transition">
                <CardHeader>
                  <CardTitle className="text-foreground">Your Progress</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    This week's achievements
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 rounded-lg bg-primary/10">
                      <div className="flex items-center justify-center mb-2">
                        <MessageSquare className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-lg font-bold text-foreground">{messages.length}</div>
                      <div className="text-xs text-muted-foreground">Conversations</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-green-500/10">
                      <div className="flex items-center justify-center mb-2">
                        <Trophy className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="text-lg font-bold text-foreground">{enhancedRecommendations.length}</div>
                      <div className="text-xs text-muted-foreground">Goals Set</div>
                    </div>
                  </div>
                  
                  {/* Nutrition Summary */}
                  {dailySummary && (
                  <div className="text-center p-3 rounded-lg bg-blue-500/10">
                    <div className="flex items-center justify-center mb-2">
                        <Target className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="text-lg font-bold text-foreground">
                        {dailySummary.totalCalories || 0} cal
                    </div>
                      <div className="text-xs text-muted-foreground">Today's Intake</div>
                  </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
