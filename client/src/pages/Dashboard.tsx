import { useAuth } from "../hooks/use-auth";
import { Link } from "wouter";
import BackButton from "../components/BackButton";
import { 
  LogOut, 
  Plus, 
  ChartBar, 
  Brain, 
  Apple, 
  Droplet, 
  Activity, 
  Target,
  TrendingUp,
  Clock,
  Flame,
  Scale,
  Bell
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn } from "../lib/queryClient";
import { Suspense, lazy, useState } from "react";
import DashboardBackground from "../components/DashboardBackground";
import DashboardSkeleton from "../components/DashboardSkeleton";
import { motion } from "framer-motion";
import { ThemeToggle } from "../components/ThemeToggle";
import { toast } from "../hooks/use-toast";

// Lazy load components
const NutritionChart = lazy(() => import("../components/NutritionChart"));
const AIRecommendations = lazy(() => import("../components/AIRecommendations"));
const WeeklyCaloriesChart = lazy(() => import("../components/WeeklyCaloriesChart"));
const AIChatInterface = lazy(() => import("../components/AIChatInterface"));
const NutrientBreakdownChart = lazy(() => import("../components/NutrientBreakdownChart"));

// Mock data for demonstration
const mockNutritionData = {
  calories: { consumed: 1850, target: 2200, unit: "kcal" },
  protein: { consumed: 85, target: 120, unit: "g" },
  carbs: { consumed: 220, target: 275, unit: "g" },
  fat: { consumed: 65, target: 73, unit: "g" },
  fiber: { consumed: 28, target: 30, unit: "g" },
  water: { consumed: 1800, target: 2500, unit: "ml" }
};

const mockRecentEntries = [
  { id: 1, name: "Grilled Chicken Salad", calories: 320, time: "2 hours ago", type: "lunch" },
  { id: 2, name: "Greek Yogurt with Berries", calories: 180, time: "4 hours ago", type: "snack" },
  { id: 3, name: "Oatmeal with Banana", calories: 280, time: "6 hours ago", type: "breakfast" },
  { id: 4, name: "Salmon with Vegetables", calories: 450, time: "1 day ago", type: "dinner" }
];

const mockGoals = [
  { id: 1, title: "Lose 5kg", progress: 60, target: "2 months", icon: Scale },
  { id: 2, title: "Run 5km", progress: 80, target: "1 month", icon: Activity },
  { id: 3, title: "Drink 2L water daily", progress: 90, target: "Ongoing", icon: Droplet }
];

const mockAIRecommendations = [
  { id: 1, type: "nutrition", message: "Consider adding more protein to your breakfast for better satiety", priority: "high" },
  { id: 2, type: "hydration", message: "You're 700ml short of your daily water goal", priority: "medium" },
  { id: 3, type: "exercise", message: "Great job hitting your calorie target! Time for a workout", priority: "low" }
];

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Fetch initial data to determine loading state
  const { isLoading: isInitialLoading } = useQuery({
    queryKey: [`/api/dashboard?userId=${user?.id}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mock mutation for adding food entry
  const addFoodMutation = useMutation({
    mutationFn: async (foodData: any) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true, data: foodData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/dashboard?userId=${user?.id}`] });
      toast({
        title: "Food entry added!",
        description: "Your nutrition data has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add food entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleQuickAdd = (foodType: string) => {
    addFoodMutation.mutate({
      name: `Quick ${foodType}`,
      calories: Math.floor(Math.random() * 300) + 100,
      type: foodType,
      timestamp: new Date().toISOString()
    });
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "progress-success";
    if (percentage >= 60) return "progress-warning";
    return "progress-error";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "badge-error";
      case "medium": return "badge-warning";
      case "low": return "badge-success";
      default: return "badge-neutral";
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 via-base-200 to-base-300">
      <DashboardBackground />
      
      <div className="relative z-20">
        {/* Enhanced Header */}
        <motion.header 
          className="navbar bg-base-100/80 backdrop-blur-lg border-b border-base-300 sticky top-0 z-50"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="navbar-start">
            <Link href="/" className="btn btn-ghost text-xl font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-2 group">
              <Apple className="h-6 w-6 group-hover:scale-110 transition-transform" />
              <span>NutriTrack</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-4 ml-6">
              <Link href="/tracker" className="btn btn-ghost btn-sm text-base-content/70 hover:text-primary transition-colors flex items-center gap-1 group">
                <Activity className="h-4 w-4 group-hover:scale-110 transition-transform" />
                Tracker
              </Link>
              <Link href="/ai-coach" className="btn btn-ghost btn-sm text-base-content/70 hover:text-primary transition-colors flex items-center gap-1 group">
                <Brain className="h-4 w-4 group-hover:scale-110 transition-transform" />
                AI Coach
              </Link>
              <Link href="/stats" className="btn btn-ghost btn-sm text-base-content/70 hover:text-primary transition-colors flex items-center gap-1 group">
                <ChartBar className="h-4 w-4 group-hover:scale-110 transition-transform" />
                Stats
              </Link>
              <Link href="/profile" className="btn btn-ghost btn-sm text-base-content/70 hover:text-primary transition-colors flex items-center gap-1 group">
                <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-medium text-primary">{user?.username?.charAt(0).toUpperCase()}</span>
                </div>
                Profile
              </Link>
            </div>
          </div>

          <div className="navbar-end">
            <div className="hidden md:flex items-center gap-2 mr-4">
              <button className="btn btn-ghost btn-sm relative">
                <Bell className="h-4 w-4" />
                <span className="badge badge-error badge-xs absolute -top-1 -right-1"></span>
              </button>
              <Link href="/profile">
                <div className="avatar placeholder cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                  <div className="bg-primary/10 text-primary rounded-full w-8">
                    <span className="text-xs">{user?.username?.charAt(0).toUpperCase()}</span>
                  </div>
                </div>
              </Link>
            </div>
            
            <span className="text-sm text-base-content/70 hidden sm:block mr-4">
              Welcome, {user?.username}
            </span>
            
            <BackButton className="mr-2" />
            <ThemeToggle />
            
            <button 
              className="btn btn-outline btn-sm"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </button>
          </div>
        </motion.header>
        
        <main className="container mx-auto px-4 py-8">
          {isInitialLoading ? (
            <DashboardSkeleton />
          ) : (
            <Suspense fallback={<DashboardSkeleton />}>
              <motion.div 
                className="space-y-8"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {/* Quick Stats Row */}
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                  variants={itemVariants}
                >
                  <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 border border-base-300">
                    <div className="card-body p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-base-content/70">Today's Calories</p>
                          <p className="text-2xl font-bold text-base-content">{mockNutritionData.calories.consumed}</p>
                          <p className="text-xs text-base-content/70">of {mockNutritionData.calories.target} kcal</p>
                        </div>
                        <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/30">
                          <Flame className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                        </div>
                      </div>
                      <progress 
                        className={`progress w-full mt-4 ${getProgressColor((mockNutritionData.calories.consumed / mockNutritionData.calories.target) * 100)}`}
                        value={(mockNutritionData.calories.consumed / mockNutritionData.calories.target) * 100}
                        max="100"
                      />
                    </div>
                  </div>

                  <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 border border-base-300">
                    <div className="card-body p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-base-content/70">Protein Intake</p>
                          <p className="text-2xl font-bold text-base-content">{mockNutritionData.protein.consumed}g</p>
                          <p className="text-xs text-base-content/70">of {mockNutritionData.protein.target}g</p>
                        </div>
                        <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                          <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <progress 
                        className={`progress w-full mt-4 ${getProgressColor((mockNutritionData.protein.consumed / mockNutritionData.protein.target) * 100)}`}
                        value={(mockNutritionData.protein.consumed / mockNutritionData.protein.target) * 100}
                        max="100"
                      />
                    </div>
                  </div>

                  <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 border border-base-300">
                    <div className="card-body p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-base-content/70">Water Intake</p>
                          <p className="text-2xl font-bold text-base-content">{mockNutritionData.water.consumed}ml</p>
                          <p className="text-xs text-base-content/70">of {mockNutritionData.water.target}ml</p>
                        </div>
                        <div className="p-3 rounded-full bg-cyan-100 dark:bg-cyan-900/30">
                          <Droplet className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                        </div>
                      </div>
                      <progress 
                        className={`progress w-full mt-4 ${getProgressColor((mockNutritionData.water.consumed / mockNutritionData.water.target) * 100)}`}
                        value={(mockNutritionData.water.consumed / mockNutritionData.water.target) * 100}
                        max="100"
                      />
                    </div>
                  </div>

                  <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 border border-base-300">
                    <div className="card-body p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-base-content/70">Active Goals</p>
                          <p className="text-2xl font-bold text-base-content">{mockGoals.length}</p>
                          <p className="text-xs text-base-content/70">in progress</p>
                        </div>
                        <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                          <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                      <div className="mt-4 flex gap-1">
                        {mockGoals.map((goal, index) => (
                          <div 
                            key={goal.id}
                            className={`h-2 flex-1 rounded-full ${getProgressColor(goal.progress)}`}
                            style={{ opacity: 0.7 + (index * 0.1) }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Main Content Tabs */}
                <motion.div variants={itemVariants}>
                  <div className="tabs tabs-boxed bg-base-200/50 p-1">
                    <button 
                      className={`tab flex-1 ${activeTab === "overview" ? "tab-active" : ""}`}
                      onClick={() => setActiveTab("overview")}
                    >
                      Overview
                    </button>
                    <button 
                      className={`tab flex-1 ${activeTab === "nutrition" ? "tab-active" : ""}`}
                      onClick={() => setActiveTab("nutrition")}
                    >
                      Nutrition
                    </button>
                    <button 
                      className={`tab flex-1 ${activeTab === "goals" ? "tab-active" : ""}`}
                      onClick={() => setActiveTab("goals")}
                    >
                      Goals
                    </button>
                    <button 
                      className={`tab flex-1 ${activeTab === "ai" ? "tab-active" : ""}`}
                      onClick={() => setActiveTab("ai")}
                    >
                      AI Assistant
                    </button>
                    <button 
                      className={`tab flex-1 ${activeTab === "profile" ? "tab-active" : ""}`}
                      onClick={() => setActiveTab("profile")}
                    >
                      Profile
                    </button>
                  </div>

                  <div className="mt-6">
                    {activeTab === "overview" && (
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {/* Quick Add Section */}
                        <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 border border-base-300">
                          <div className="card-body">
                            <h2 className="card-title text-primary">
                              <Plus className="h-5 w-5" />
                              Quick Add
                            </h2>
                            <p className="text-base-content/70">Add common foods quickly</p>
                            <div className="space-y-3 mt-4">
                              {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((meal) => (
                                <button
                                  key={meal}
                                  className="btn btn-outline w-full justify-between hover:bg-primary/10"
                                  onClick={() => handleQuickAdd(meal.toLowerCase())}
                                  disabled={addFoodMutation.isPending}
                                >
                                  <span>{meal}</span>
                                  <Plus className="h-4 w-4" />
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Recent Entries */}
                        <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 border border-base-300">
                          <div className="card-body">
                            <h2 className="card-title text-primary">
                              <Clock className="h-5 w-5" />
                              Recent Entries
                            </h2>
                            <p className="text-base-content/70">Your latest food entries</p>
                            <div className="space-y-3 mt-4">
                              {mockRecentEntries.map((entry) => (
                                <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-base-200/50">
                                  <div>
                                    <p className="font-medium text-sm">{entry.name}</p>
                                    <p className="text-xs text-base-content/70">{entry.time}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-semibold text-sm">{entry.calories} kcal</p>
                                    <span className="badge badge-neutral badge-sm">
                                      {entry.type}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* AI Recommendations */}
                        <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 border border-base-300">
                          <div className="card-body">
                            <h2 className="card-title text-primary">
                              <Brain className="h-5 w-5" />
                              AI Insights
                            </h2>
                            <p className="text-base-content/70">Personalized recommendations</p>
                            <div className="space-y-3 mt-4">
                              {mockAIRecommendations.map((rec) => (
                                <div key={rec.id} className="p-3 rounded-lg bg-base-200/50">
                                  <div className="flex items-start justify-between mb-2">
                                    <span className={`badge ${getPriorityColor(rec.priority)}`}>
                                      {rec.priority}
                                    </span>
                                  </div>
                                  <p className="text-sm">{rec.message}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "nutrition" && (
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 border border-base-300">
                          <div className="card-body">
                            <h2 className="card-title">Nutrition Chart</h2>
                            <NutritionChart />
                          </div>
                        </div>

                        <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 border border-base-300">
                          <div className="card-body">
                            <h2 className="card-title">Nutrient Breakdown</h2>
                            <NutrientBreakdownChart />
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "goals" && (
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 border border-base-300">
                          <div className="card-body">
                            <h2 className="card-title">Your Goals</h2>
                            <p className="text-base-content/70">Track your progress</p>
                            <div className="space-y-4 mt-4">
                              {mockGoals.map((goal) => {
                                const IconComponent = goal.icon;
                                return (
                                  <div key={goal.id} className="p-4 rounded-lg bg-base-200/50">
                                    <div className="flex items-center gap-3 mb-3">
                                      <IconComponent className="h-5 w-5 text-primary" />
                                      <div>
                                        <p className="font-medium">{goal.title}</p>
                                        <p className="text-sm text-base-content/70">Target: {goal.target}</p>
                                      </div>
                                    </div>
                                    <progress 
                                      className={`progress w-full mb-2 ${getProgressColor(goal.progress)}`}
                                      value={goal.progress}
                                      max="100"
                                    />
                                    <p className="text-xs text-base-content/70">{goal.progress}% complete</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 border border-base-300">
                          <div className="card-body">
                            <h2 className="card-title">Weekly Progress</h2>
                            <WeeklyCaloriesChart />
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "ai" && (
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 border border-base-300">
                          <div className="card-body">
                            <h2 className="card-title">AI Chat Assistant</h2>
                            <p className="text-base-content/70">Get personalized nutrition advice</p>
                            <AIChatInterface />
                          </div>
                        </div>

                        <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 border border-base-300">
                          <div className="card-body">
                            <h2 className="card-title">AI Recommendations</h2>
                            <p className="text-base-content/70">Smart suggestions for your health</p>
                            <AIRecommendations />
                          </div>
                        </div>
                      </div>
                                         )}

                     {activeTab === "profile" && (
                       <div className="grid gap-6 md:grid-cols-2">
                         <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 border border-base-300">
                           <div className="card-body">
                             <h2 className="card-title">User Profile</h2>
                             <p className="text-base-content/70">Manage your account settings and preferences</p>
                             <div className="mt-4">
                               <Link href="/profile" className="btn btn-primary">
                                 Go to Profile Page
                               </Link>
                             </div>
                           </div>
                         </div>

                         <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 border border-base-300">
                           <div className="card-body">
                             <h2 className="card-title">Account Settings</h2>
                             <p className="text-base-content/70">Update your personal information and preferences</p>
                             <div className="mt-4 space-y-2">
                               <div className="flex items-center justify-between p-3 rounded-lg bg-base-200/50">
                                 <span className="font-medium">Username</span>
                                 <span className="text-base-content/70">{user?.username}</span>
                               </div>
                               <div className="flex items-center justify-between p-3 rounded-lg bg-base-200/50">
                                 <span className="font-medium">Email</span>
                                 <span className="text-base-content/70">{user?.email}</span>
                               </div>
                               <div className="flex items-center justify-between p-3 rounded-lg bg-base-200/50">
                                 <span className="font-medium">Member Since</span>
                                 <span className="text-base-content/70">2024</span>
                               </div>
                             </div>
                           </div>
                         </div>
                       </div>
                     )}
                   </div>
                 </motion.div>
               </motion.div>
             </Suspense>
           )}
         </main>
       </div>
     </div>
   );
 }