import { useAuth } from "../hooks/use-auth";
import { Link } from "wouter";
import { 
  Plus, 
  Brain, 
  Droplet, 
  Target,
  TrendingUp,
  Flame
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "../lib/queryClient";
import { Suspense, lazy } from "react";
import DashboardSkeleton from "../components/DashboardSkeleton";
import { motion } from "framer-motion";

// Lazy load components
const NutrientBreakdownChart = lazy(() => import("../components/NutrientBreakdownChart"));

export default function Dashboard() {
  const { user } = useAuth();
  
  // Fetch initial data to determine loading state and populate UI
  const { data: dashboardData, isLoading: isInitialLoading } = useQuery<any>({
    queryKey: [`/api/dashboard/${user?.id}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user?.id,
    staleTime: 0, // Always refetch to prevent cross-user stale data
  });

  // Map API data — strictly from user-specific DB responses
  const goals = dashboardData?.goals;
  const nutritionData = {
    calories: { consumed: dashboardData?.dailyTotals?.calories || 0, target: goals?.calories || 0, unit: "kcal" },
    protein: { consumed: dashboardData?.dailyTotals?.protein || 0, target: goals?.protein || 0, unit: "g" },
    carbs: { consumed: dashboardData?.dailyTotals?.carbs || 0, target: goals?.carbs || 0, unit: "g" },
    fat: { consumed: dashboardData?.dailyTotals?.fat || 0, target: goals?.fat || 0, unit: "g" },
    fiber: { consumed: dashboardData?.dailyTotals?.fiber || 0, target: goals?.fiber || 0, unit: "g" },
    water: { consumed: 0, target: goals?.water || 0, unit: "ml" }
  };

  const profile = dashboardData?.profile;
  const primaryGoal = profile?.goal?.primaryGoal;
  const workoutDays = profile?.workout?.daysPerWeek || 0;

  // Build goal cards dynamically based on the user's ACTUAL selected goal
  let dynamicGoals: any[] = [];

  if (primaryGoal === 'LOSE_WEIGHT') {
    const currentWeight = profile?.profile?.weightKg || 0;
    const targetWeight = profile?.profile?.targetWeightKg || currentWeight;
    let weightProgress = 0;
    if (currentWeight && targetWeight && currentWeight !== targetWeight) {
      const startWeight = profile?.profile?.startWeightKg || (currentWeight > targetWeight ? currentWeight + 5 : currentWeight - 5);
      const totalDiff = Math.abs(startWeight - targetWeight);
      const currentDiff = Math.abs(currentWeight - targetWeight);
      weightProgress = totalDiff > 0 ? Math.min(100, Math.max(0, Math.round(((totalDiff - currentDiff) / totalDiff) * 100))) : 50;
    }
    dynamicGoals.push({
      id: 1,
      title: "Weight Loss Plan",
      progress: weightProgress,
      target: `${targetWeight} kg`,
      subtitle: `Current: ${currentWeight} kg | Target: ${targetWeight} kg`,
      icon: Target
    });
  } else if (primaryGoal === 'GAIN_WEIGHT') {
    const currentWeight = profile?.profile?.weightKg || 0;
    const targetWeight = profile?.profile?.targetWeightKg || currentWeight;
    let weightProgress = 0;
    if (currentWeight && targetWeight && currentWeight !== targetWeight) {
      const startWeight = profile?.profile?.startWeightKg || currentWeight - 5;
      const totalDiff = Math.abs(targetWeight - startWeight);
      const currentDiff = Math.abs(targetWeight - currentWeight);
      weightProgress = totalDiff > 0 ? Math.min(100, Math.max(0, Math.round(((totalDiff - currentDiff) / totalDiff) * 100))) : 50;
    }
    dynamicGoals.push({
      id: 1,
      title: "Weight Gain Plan",
      progress: weightProgress,
      target: `${targetWeight} kg`,
      subtitle: `Current: ${currentWeight} kg | Target: ${targetWeight} kg`,
      icon: Target
    });
  } else if (primaryGoal === 'BUILD_MUSCLE') {
    dynamicGoals.push({
      id: 1,
      title: "Muscle Building Plan",
      progress: Math.min(100, dashboardData?.progress?.protein || 0),
      target: `${goals?.protein || 0}g Protein`,
      subtitle: workoutDays ? `Workout Goal: ${workoutDays} days/week` : `Target: ${goals?.protein || 0}g Protein`,
      icon: Target
    });
  } else if (primaryGoal === 'IMPROVE_FITNESS' || primaryGoal === 'IMPROVE_STRENGTH') {
    dynamicGoals.push({
      id: 1,
      title: primaryGoal === 'IMPROVE_FITNESS' ? "Fitness Improvement Plan" : "Strength Improvement Plan",
      progress: Math.min(100, dashboardData?.progress?.calories || 0),
      target: `${goals?.calories || 0} kcal`,
      subtitle: workoutDays ? `Workout Goal: ${workoutDays} days/week` : `Target: ${goals?.calories || 0} kcal`,
      icon: Target
    });
  } else if (primaryGoal) {
    const goalLabel = primaryGoal.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    dynamicGoals.push({
      id: 1,
      title: `${goalLabel} Plan`,
      progress: Math.min(100, dashboardData?.progress?.calories || 0),
      target: `${goals?.calories || 0} kcal`,
      subtitle: workoutDays ? `Workout Goal: ${workoutDays} days/week` : `Target: ${goals?.calories || 0} kcal`,
      icon: Flame
    });
  } else {
    dynamicGoals.push({
      id: 1,
      title: "Daily Calorie Target",
      progress: Math.min(100, dashboardData?.progress?.calories || 0),
      target: goals?.calories ? `${goals.calories} kcal` : "Not set",
      subtitle: goals?.calories ? `Goal: ${goals.calories} kcal` : undefined,
      icon: Flame
    });
  }

  dynamicGoals.push({
    id: 2,
    title: "Protein Target",
    progress: Math.min(100, dashboardData?.progress?.protein || 0),
    target: goals?.protein ? `${goals.protein} g` : "Not set",
    subtitle: goals?.protein ? `Target: ${goals.protein} g` : undefined,
    icon: TrendingUp
  });
  dynamicGoals.push({
    id: 3,
    title: "Hydration Target",
    progress: 0,
    target: goals?.water ? `${goals.water} ml` : "Not set",
    subtitle: goals?.water ? `Target: ${goals.water} ml` : undefined,
    icon: Droplet
  });

  const activeGoals = dynamicGoals;
  const recentEntries = dashboardData?.recentEntries || [];
  const aiRecommendations = dashboardData?.recommendations || [];

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
  
  return (
    <div className="min-h-screen bg-background">
      <div className="relative z-20">
        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
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
                {/* Welcome Section */}
                <motion.div variants={itemVariants} className="mb-6">
                  <h1 className="text-3xl font-bold text-foreground">Welcome back, {user?.displayName || user?.username || 'User'}!</h1>
                  <p className="text-muted-foreground mt-1">Here's your nutrition overview for today.</p>
                </motion.div>

                {/* Quick Stats Row */}
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                  variants={itemVariants}
                >
                  <div className="card min-w-0 bg-card text-card-foreground shadow-sm hover:shadow-md transition-all duration-300 border border-border">
                    <div className="card-body p-5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30">
                            <Flame className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          </div>
                          <p className="text-sm font-medium">Calories</p>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1">
                          <p className="text-2xl font-bold">{nutritionData.calories.consumed}</p>
                          <p className="text-sm text-muted-foreground">/ {nutritionData.calories.target} kcal</p>
                        </div>
                      </div>
                      <progress 
                        className={`progress w-full mt-3 ${getProgressColor((nutritionData.calories.consumed / (nutritionData.calories.target || 1)) * 100)}`}
                        value={Math.min(100, (nutritionData.calories.consumed / (nutritionData.calories.target || 1)) * 100)}
                        max="100"
                      />
                      <p className="text-xs text-muted-foreground mt-2">{Math.max(0, nutritionData.calories.target - nutritionData.calories.consumed)} kcal remaining</p>
                    </div>
                  </div>

                  <div className="card min-w-0 bg-card text-card-foreground shadow-sm hover:shadow-md transition-all duration-300 border border-border">
                    <div className="card-body p-5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                            <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <p className="text-sm font-medium">Protein</p>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1">
                          <p className="text-2xl font-bold">{nutritionData.protein.consumed}g</p>
                          <p className="text-sm text-muted-foreground">/ {nutritionData.protein.target}g</p>
                        </div>
                      </div>
                      <progress 
                        className={`progress w-full mt-3 ${getProgressColor((nutritionData.protein.consumed / (nutritionData.protein.target || 1)) * 100)}`}
                        value={Math.min(100, (nutritionData.protein.consumed / (nutritionData.protein.target || 1)) * 100)}
                        max="100"
                      />
                      <p className="text-xs text-muted-foreground mt-2">{Math.max(0, nutritionData.protein.target - nutritionData.protein.consumed)}g remaining</p>
                    </div>
                  </div>

                  <div className="card min-w-0 bg-card text-card-foreground shadow-sm hover:shadow-md transition-all duration-300 border border-border">
                    <div className="card-body p-5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-full bg-cyan-100 dark:bg-cyan-900/30">
                            <Droplet className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                          </div>
                          <p className="text-sm font-medium">Water</p>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1">
                          <p className="text-2xl font-bold">{nutritionData.water.consumed}ml</p>
                          <p className="text-sm text-muted-foreground">/ {nutritionData.water.target}ml</p>
                        </div>
                      </div>
                      <progress 
                        className={`progress w-full mt-3 ${getProgressColor((nutritionData.water.consumed / (nutritionData.water.target || 1)) * 100)}`}
                        value={Math.min(100, (nutritionData.water.consumed / (nutritionData.water.target || 1)) * 100)}
                        max="100"
                      />
                      <p className="text-xs text-muted-foreground mt-2">{Math.max(0, nutritionData.water.target - nutritionData.water.consumed)}ml remaining</p>
                    </div>
                  </div>

                  <div className="card bg-card text-card-foreground shadow-sm hover:shadow-md transition-all duration-300 border border-border">
                    <div className="card-body p-5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <p className="text-sm font-medium">Goals</p>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1">
                          <p className="text-2xl font-bold">{activeGoals.length}</p>
                          <p className="text-sm text-muted-foreground">Active</p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-1 h-2">
                        {activeGoals.map((goal, index) => (
                          <div 
                            key={goal.id}
                            className={`h-full flex-1 rounded-full ${getProgressColor(goal.progress)}`}
                            style={{ opacity: 0.7 + (index * 0.1) }}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Track your progress</p>
                    </div>
                  </div>
                </motion.div>

                {/* Middle Row: Nutrition & Goals */}
                <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6" variants={itemVariants}>
                  <div className="card min-w-0 bg-card text-card-foreground shadow-sm border border-border">
                    <div className="card-body p-6">
                      <h2 className="card-title text-lg font-semibold mb-4">Today's Nutrition</h2>
                      <div className="min-h-[250px]">
                        <NutrientBreakdownChart />
                      </div>
                    </div>
                  </div>
                  
                  <div className="card min-w-0 bg-card text-card-foreground shadow-sm border border-border">
                    <div className="card-body p-6">
                      <h2 className="card-title text-lg font-semibold mb-4">Goal Progress</h2>
                      <div className="space-y-6">
                        {activeGoals.map((goal) => {
                          const IconComponent = goal.icon;
                          return (
                            <div key={goal.id}>
                              <div className="flex justify-between items-end mb-2">
                                <div className="flex items-center gap-2">
                                  <IconComponent className="h-4 w-4 text-primary" />
                                  <span className="font-medium text-sm">{goal.title}</span>
                                </div>
                                <div className="text-right">
                                  {goal.subtitle && <div className="text-xs text-muted-foreground">{goal.subtitle}</div>}
                                  <span className="text-sm font-medium">{goal.progress}%</span>
                                </div>
                              </div>
                              <progress 
                                className={`progress w-full h-2 ${getProgressColor(goal.progress)}`}
                                value={goal.progress}
                                max="100"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Bottom Row: Recent Entries & AI Insights */}
                <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6" variants={itemVariants}>
                  <div className="card bg-card text-card-foreground shadow-sm border border-border flex flex-col">
                    <div className="card-body p-6 flex flex-col flex-1">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="card-title text-lg font-semibold">Recent Food Entries</h2>
                        <Link href="/tracker" className="btn btn-ghost btn-sm text-primary">View All</Link>
                      </div>
                      
                      <div className="space-y-3 flex-1 overflow-y-auto">
                        {recentEntries.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                            <div className="bg-muted w-12 h-12 rounded-full flex items-center justify-center mb-3">
                              <Plus className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="text-muted-foreground text-sm max-w-[200px]">No food entries yet. Start tracking your meals to see them here.</p>
                            <Link href="/tracker" className="btn btn-primary btn-sm mt-4">Log First Meal</Link>
                          </div>
                        ) : (
                          recentEntries.slice(0, 5).map((entry: any) => (
                            <div key={entry.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center shadow-sm">
                                  <span className="text-lg">🍽️</span>
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{entry.name || 'Unknown Food'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(entry.entryDate || entry.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-sm">{entry.calories || 0} kcal</p>
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                                  {entry.type || 'other'}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="card bg-card text-card-foreground shadow-sm border border-border flex flex-col">
                    <div className="card-body p-6 flex flex-col flex-1">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="card-title text-lg font-semibold flex items-center gap-2">
                          <Brain className="h-5 w-5 text-primary" />
                          AI Insights
                        </h2>
                      </div>
                      
                      <div className="space-y-4 flex-1">
                        {aiRecommendations.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                            <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-3">
                              <Brain className="h-6 w-6 text-primary" />
                            </div>
                            <p className="text-muted-foreground text-sm max-w-[250px]">Your AI insights will appear here. Log a few meals and NutriTrack AI will start identifying patterns.</p>
                          </div>
                        ) : (
                          aiRecommendations.slice(0, 3).map((rec: any, index: number) => (
                            <div key={rec.id || index} className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="font-medium text-sm text-foreground">{rec.title || 'Insight'}</h3>
                                <span className={`text-[10px] px-2 py-1 rounded-full uppercase tracking-wider font-semibold ${
                                  rec.priority === 'high' ? 'bg-destructive/10 text-destructive' : 
                                  rec.priority === 'medium' ? 'bg-warning/10 text-warning-content' : 
                                  'bg-success/10 text-success-content'
                                }`}>
                                  {rec.priority || 'Info'}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">{rec.description || rec.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
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