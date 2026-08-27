import { useState } from 'react';
import { Link } from 'wouter';
import { ApiError } from '@/lib/queryClient';
import { barPct } from '@shared/nutrition-math';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as LucideIcons from 'lucide-react';
import {
  Target, 
  Zap, 
  Apple, 
  Droplet, 
  Loader2,
  Award,
  Sparkles
} from 'lucide-react';

interface NutritionData {
  date: string;
  fullDate: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
}

interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  unit: string;
  category: 'nutrition' | 'fitness' | 'lifestyle';
  deadline: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export default function Stats() {
  const [selectedMetric, setSelectedMetric] = useState('calories');

  const { data: statsData, isLoading, error } = useQuery<any>({
    queryKey: ['/api/stats'],
    retry: 2, // Retry on transient failures (e.g. slow AI response)
    staleTime: 5 * 60 * 1000, // Re-fetch stats every 5 minutes instead of Infinity
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // A user with no plan gets a route to fix it, not a dead-end error screen.
  if (error instanceof ApiError && error.code === "NO_PLAN") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gradient-bg gap-4 px-4 text-center">
        <p className="text-lg font-medium text-foreground">No stats yet</p>
        <p className="text-muted-foreground text-sm max-w-sm">
          Your stats are measured against your personalized plan. Build the plan first and this page fills in.
        </p>
        <Link href="/onboarding" className="btn btn-primary btn-sm">Build my plan</Link>
      </div>
    );
  }

  if (error || !statsData) {
    console.error("Stats page error state triggered:", { error, hasStatsData: !!statsData, statsData });
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gradient-bg gap-4">
        <p className="text-destructive text-lg font-medium">Failed to load statistics.</p>
        <p className="text-muted-foreground text-sm">
          {error instanceof Error ? error.message : "Please make sure you are logged in."}
        </p>
        <button 
          className="btn btn-primary btn-sm"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  const nutritionData: NutritionData[] = statsData.nutritionData || [];
  const goals: Goal[] = statsData.goals || [];
  const achievements: Achievement[] = statsData.achievements || [];
  const insights: string = statsData.insights || "";

  const highestCalorieDay = nutritionData.length > 0 ? nutritionData.reduce((prev, current) => {
    return (prev.calories > current.calories) ? prev : current;
  }) : null;

  const getCurrentValue = (metric?: string) => {
    if (!nutritionData.length) return 0;
    const today = nutritionData[nutritionData.length - 1];
    return (today[(metric || selectedMetric) as keyof NutritionData] as number) || 0;
  };

  const getAverageValue = (metric?: string) => {
    if (!nutritionData.length) return 0;
    const values = nutritionData.map(d => (d[(metric || selectedMetric) as keyof NutritionData] as number) || 0);
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  };

  const getProgressPercentage = (goal: Goal) => {
    if (!goal.target) return 0;
    return Math.min((goal.current / goal.target) * 100, 100);
  };



  const getMetricColor = (metric: string) => {
    switch (metric) {
      case 'calories': return 'text-orange-500';
      case 'protein': return 'text-blue-500';
      case 'carbs': return 'text-green-500';
      case 'fat': return 'text-yellow-500';
      case 'fiber': return 'text-purple-500';
      case 'sugar': return 'text-pink-500';
      default: return 'text-primary';
    }
  };

  const metricColor = getMetricColor(selectedMetric);

  return (
    <div className="min-h-screen gradient-bg theme-transition pb-20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Nutrition Statistics</h1>
              <p className="text-muted-foreground">Track your progress and analyze your nutrition data</p>
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            
            {/* AI Insights */}
            {insights && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="card-shadow theme-transition border-primary/20 bg-primary/5 rounded-3xl">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <CardTitle className="text-foreground">AI Insights</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {insights}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Weekly Chart & Highlights */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              <Card className="card-shadow theme-transition rounded-3xl lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-primary/10 rounded-xl">
                        <span className="text-xl">📅</span>
                      </div>
                      <div>
                        <CardTitle className="text-foreground">Weekly Overview</CardTitle>
                      </div>
                    </div>
                    <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                      <SelectTrigger className="w-32 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="calories">Calories</SelectItem>
                        <SelectItem value="protein">Protein</SelectItem>
                        <SelectItem value="carbs">Carbs</SelectItem>
                        <SelectItem value="fat">Fat</SelectItem>
                        <SelectItem value="fiber">Fiber</SelectItem>
                        <SelectItem value="sugar">Sugar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Simple Bar Chart */}
                    <div className="flex items-end justify-between h-48 gap-2 pt-4">
                      {nutritionData.length === 0 ? (
                        <div className="w-full flex items-center justify-center text-muted-foreground text-sm h-full border border-dashed rounded-2xl">
                          No data available for this week.
                        </div>
                      ) : (
                        nutritionData.map((data, index) => {
                          const value = (data[selectedMetric as keyof NutritionData] as number) || 0;
                          const maxValue = Math.max(...nutritionData.map(d => (d[selectedMetric as keyof NutritionData] as number) || 0), 1);
                          const height = Math.max((value / maxValue) * 100, 4); // min height of 4% for visibility
                          
                          return (
                            <div key={index} className="flex-1 flex flex-col items-center group relative">
                              <div className="absolute -top-8 bg-card border border-border shadow-sm px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {value} {selectedMetric === 'calories' ? 'kcal' : 'g'}
                              </div>
                              <div 
                                className={`w-full max-w-[40px] rounded-t-xl transition-all duration-300 ${metricColor.replace('text-', 'bg-')} bg-opacity-30 group-hover:bg-opacity-100`}
                                style={{ height: `${height}%` }}
                              />
                              <span className="text-xs text-muted-foreground mt-3 font-medium">
                                {data.date.substring(0, 3)}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Highlights Column */}
              <div className="space-y-6">
                <Card className="card-shadow theme-transition rounded-3xl h-full flex flex-col justify-center">
                  <CardHeader>
                    <CardTitle className="text-foreground text-lg text-center text-muted-foreground">Highest Calorie Day</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-4">
                      <Zap className="h-8 w-8 text-orange-500" />
                    </div>
                    {highestCalorieDay ? (
                      <>
                        <h3 className="text-2xl font-bold text-foreground mb-1">{highestCalorieDay.fullDate.split(',')[0] || highestCalorieDay.date}</h3>
                        <p className="text-lg text-orange-500 font-semibold">{highestCalorieDay.calories} kcal</p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">Not enough data</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            {/* Key Metrics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h3 className="text-lg font-semibold text-foreground mb-4 mt-8 px-1">Daily Averages</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="card-shadow theme-transition rounded-2xl">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-orange-500/10">
                        <Zap className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Calories</p>
                        <p className="text-xl font-bold text-foreground">{getAverageValue('calories')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-shadow theme-transition rounded-2xl">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-500/10">
                        <Target className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Protein</p>
                        <p className="text-xl font-bold text-foreground">{getAverageValue('protein')}g</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-shadow theme-transition rounded-2xl">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-green-500/10">
                        <Apple className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Carbs</p>
                        <p className="text-xl font-bold text-foreground">{getAverageValue('carbs')}g</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-shadow theme-transition rounded-2xl">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-yellow-500/10">
                        <Droplet className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Fat</p>
                        <p className="text-xl font-bold text-foreground">{getAverageValue('fat')}g</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>

          {/* Nutrition Tab */}
          <TabsContent value="nutrition" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Detailed Nutrition Stats */}
                <Card className="card-shadow theme-transition">
                  <CardHeader>
                    <CardTitle className="text-foreground">Nutrition Breakdown</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Detailed analysis of your today's nutrition intake
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {[
                      // Targets come from /api/stats, which derives them from the
                      // persisted plan. No stand-in values: a missing target
                      // renders as 0 and the row shows "—" rather than a number
                      // that was never calculated for this user.
                      { name: 'Calories', metric: 'calories', target: goals.find(g => g.name === 'Daily Calories')?.target ?? 0, unit: 'cal', color: 'bg-orange-500' },
                      { name: 'Protein', metric: 'protein', target: goals.find(g => g.name === 'Protein Intake')?.target ?? 0, unit: 'g', color: 'bg-blue-500' },
                      { name: 'Carbs', metric: 'carbs', target: goals.find(g => g.name === 'Carbs Target')?.target ?? 0, unit: 'g', color: 'bg-green-500' },
                      { name: 'Fat', metric: 'fat', target: goals.find(g => g.name === 'Fat Limit')?.target ?? 0, unit: 'g', color: 'bg-yellow-500' },
                      { name: 'Fiber', metric: 'fiber', target: goals.find(g => g.name === 'Fiber Goal')?.target ?? 0, unit: 'g', color: 'bg-purple-500' },
                      { name: 'Sugar', metric: 'sugar', target: goals.find(g => g.name === 'Sugar Limit')?.target ?? 0, unit: 'g', color: 'bg-pink-500' },
                    ].map((item, index) => {
                      const current = getCurrentValue(item.metric);
                      const percentage = Math.min((current / item.target) * 100, 100);
                      
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-foreground">{item.name}</span>
                            <span className="text-muted-foreground">
                              {current}/{item.target} {item.unit}
                            </span>
                          </div>
                          <Progress 
                            value={percentage} 
                            className="h-2"
                            indicatorColor={item.color}
                          />
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Meal Distribution Placeholder (Currently no specific meal grouping in standard data) */}
                <Card className="card-shadow theme-transition">
                  <CardHeader>
                    <CardTitle className="text-foreground">Daily Distribution Overview</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Track consistency across recent days
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {nutritionData.slice(-4).reverse().map((item, index) => {
                        const dayGoal = goals.find(g => g.name === 'Daily Calories')?.target ?? 0;
                        // barPct guards the divide-by-zero that would otherwise
                        // render NaN when no target exists.
                        const percentage = barPct(item.calories, dayGoal);
                        
                        return (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm text-foreground">{item.date}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-muted rounded-full h-2">
                                <div 
                                  className="bg-primary h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-sm text-muted-foreground w-12">
                                {item.calories} cal
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {goals.map((goal) => (
                  <Card key={goal.id} className="card-shadow theme-transition">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-foreground">{goal.name}</CardTitle>
                        <Badge variant="outline">{goal.category}</Badge>
                      </div>
                      <CardDescription className="text-muted-foreground">
                        Target: {goal.target} {goal.unit}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-foreground">
                          {goal.current} {goal.unit}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {getProgressPercentage(goal).toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={getProgressPercentage(goal)} className="h-3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {achievements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {achievements.map((achievement) => {
                    const Icon = (LucideIcons as any)[achievement.icon] || Award;
                    return (
                      <Card key={achievement.id} className="card-shadow theme-transition">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full bg-muted`}>
                              <Icon className={`h-6 w-6 ${achievement.color}`} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">{achievement.name}</h3>
                              <p className="text-sm text-muted-foreground">{achievement.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground">No Achievements Yet</h3>
                  <p className="text-muted-foreground">Keep tracking your meals to unlock AI-generated achievements!</p>
                </div>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
