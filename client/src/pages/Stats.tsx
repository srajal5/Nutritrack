import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import BackButton from '@/components/BackButton';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Zap, 
  Apple, 
  Droplet, 
  Activity,
  Award,
  Clock,
  Flame
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface NutritionData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
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

export default function Stats() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('week');
  const [selectedMetric, setSelectedMetric] = useState('calories');

  // Sample data
  const nutritionData: NutritionData[] = [
    { date: 'Mon', calories: 1850, protein: 120, carbs: 200, fat: 65, fiber: 25 },
    { date: 'Tue', calories: 1920, protein: 135, carbs: 180, fat: 70, fiber: 28 },
    { date: 'Wed', calories: 1780, protein: 110, carbs: 220, fat: 60, fiber: 22 },
    { date: 'Thu', calories: 2050, protein: 140, carbs: 190, fat: 75, fiber: 30 },
    { date: 'Fri', calories: 1950, protein: 125, carbs: 210, fat: 68, fiber: 26 },
    { date: 'Sat', calories: 2100, protein: 150, carbs: 180, fat: 80, fiber: 32 },
    { date: 'Sun', calories: 1880, protein: 115, carbs: 200, fat: 65, fiber: 24 },
  ];

  const goals: Goal[] = [
    {
      id: '1',
      name: 'Daily Calories',
      target: 2000,
      current: 1880,
      unit: 'cal',
      category: 'nutrition',
      deadline: '2024-12-31'
    },
    {
      id: '2',
      name: 'Protein Intake',
      target: 150,
      current: 125,
      unit: 'g',
      category: 'nutrition',
      deadline: '2024-12-31'
    },
    {
      id: '3',
      name: 'Workout Sessions',
      target: 5,
      current: 4,
      unit: 'sessions',
      category: 'fitness',
      deadline: '2024-12-31'
    },
    {
      id: '4',
      name: 'Weight Goal',
      target: 70,
      current: 72,
      unit: 'kg',
      category: 'lifestyle',
      deadline: '2024-12-31'
    }
  ];

  const achievements = [
    { id: '1', name: '7-Day Streak', description: 'Logged food for 7 consecutive days', icon: Award, color: 'text-yellow-500' },
    { id: '2', name: 'Protein Master', description: 'Met protein goal for 5 days', icon: Target, color: 'text-blue-500' },
    { id: '3', name: 'Early Bird', description: 'Logged breakfast for 10 days', icon: Clock, color: 'text-green-500' },
    { id: '4', name: 'Calorie Counter', description: 'Stayed within calorie range for 2 weeks', icon: Flame, color: 'text-red-500' }
  ];

  const getCurrentValue = () => {
    const today = nutritionData[nutritionData.length - 1];
    return today[selectedMetric as keyof NutritionData] as number;
  };

  const getAverageValue = () => {
    const values = nutritionData.map(d => d[selectedMetric as keyof NutritionData] as number);
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  };

  const getProgressPercentage = (goal: Goal) => {
    return Math.min((goal.current / goal.target) * 100, 100);
  };

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'calories': return Zap;
      case 'protein': return Target;
      case 'carbs': return Apple;
      case 'fat': return Droplet;
      case 'fiber': return Activity;
      default: return BarChart3;
    }
  };

  const getMetricColor = (metric: string) => {
    switch (metric) {
      case 'calories': return 'text-orange-500';
      case 'protein': return 'text-blue-500';
      case 'carbs': return 'text-green-500';
      case 'fat': return 'text-yellow-500';
      case 'fiber': return 'text-purple-500';
      default: return 'text-primary';
    }
  };

  const MetricIcon = getMetricIcon(selectedMetric);
  const metricColor = getMetricColor(selectedMetric);

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
            {/* Key Metrics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="card-shadow theme-transition">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-500/10">
                        <Zap className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg. Calories</p>
                        <p className="text-2xl font-bold text-foreground">1,920</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-green-500">+5.2%</span>
                        <span className="text-muted-foreground">vs last week</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-shadow theme-transition">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Target className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg. Protein</p>
                        <p className="text-2xl font-bold text-foreground">122g</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-green-500">+8.1%</span>
                        <span className="text-muted-foreground">vs last week</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-shadow theme-transition">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <Apple className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg. Carbs</p>
                        <p className="text-2xl font-bold text-foreground">198g</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
                        <span className="text-red-500">-2.3%</span>
                        <span className="text-muted-foreground">vs last week</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-shadow theme-transition">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-yellow-500/10">
                        <Droplet className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg. Fat</p>
                        <p className="text-2xl font-bold text-foreground">69g</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-green-500">+1.8%</span>
                        <span className="text-muted-foreground">vs last week</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            {/* Weekly Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="card-shadow theme-transition">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-foreground">Weekly Nutrition Trends</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Your nutrition data over the past week
                      </CardDescription>
                    </div>
                    <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="calories">Calories</SelectItem>
                        <SelectItem value="protein">Protein</SelectItem>
                        <SelectItem value="carbs">Carbs</SelectItem>
                        <SelectItem value="fat">Fat</SelectItem>
                        <SelectItem value="fiber">Fiber</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <MetricIcon className={`h-5 w-5 ${metricColor}`} />
                        <span className="text-sm font-medium text-foreground">Current: {getCurrentValue()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Average: {getAverageValue()}</span>
                      </div>
                    </div>
                    
                    {/* Simple Bar Chart */}
                    <div className="flex items-end justify-between h-32 gap-2">
                      {nutritionData.map((data, index) => {
                        const value = data[selectedMetric as keyof NutritionData] as number;
                        const maxValue = Math.max(...nutritionData.map(d => d[selectedMetric as keyof NutritionData] as number));
                        const height = (value / maxValue) * 100;
                        
                        return (
                          <div key={index} className="flex-1 flex flex-col items-center">
                            <div 
                              className={`w-full rounded-t-sm transition-all duration-300 ${metricColor.replace('text-', 'bg-')} bg-opacity-20`}
                              style={{ height: `${height}%` }}
                            />
                            <span className="text-xs text-muted-foreground mt-2">{data.date}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                      Detailed analysis of your nutrition intake
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {[
                      { name: 'Calories', current: 1880, target: 2000, unit: 'cal', color: 'bg-orange-500' },
                      { name: 'Protein', current: 125, target: 150, unit: 'g', color: 'bg-blue-500' },
                      { name: 'Carbs', current: 200, target: 250, unit: 'g', color: 'bg-green-500' },
                      { name: 'Fat', current: 65, target: 65, unit: 'g', color: 'bg-yellow-500' },
                      { name: 'Fiber', current: 24, target: 25, unit: 'g', color: 'bg-purple-500' }
                    ].map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-foreground">{item.name}</span>
                          <span className="text-muted-foreground">
                            {item.current}/{item.target} {item.unit}
                          </span>
                        </div>
                        <Progress 
                          value={(item.current / item.target) * 100} 
                          className="h-2"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Meal Distribution */}
                <Card className="card-shadow theme-transition">
                  <CardHeader>
                    <CardTitle className="text-foreground">Meal Distribution</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      How your calories are distributed across meals
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { meal: 'Breakfast', calories: 450, percentage: 24 },
                        { meal: 'Lunch', calories: 600, percentage: 32 },
                        { meal: 'Dinner', calories: 550, percentage: 29 },
                        { meal: 'Snacks', calories: 280, percentage: 15 }
                      ].map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-foreground">{item.meal}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${item.percentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground w-12">
                              {item.calories} cal
                            </span>
                          </div>
                        </div>
                      ))}
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
                {goals.map((goal, index) => (
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
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Deadline</span>
                        <span className="text-foreground">
                          {new Date(goal.deadline).toLocaleDateString()}
                        </span>
                      </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {achievements.map((achievement, index) => {
                  const Icon = achievement.icon;
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
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
