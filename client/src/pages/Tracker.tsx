import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { FoodEntryDocument } from '@/types';
import FoodEntryForm from '@/components/FoodEntryForm';
import NutritionInsights from '@/components/NutritionInsights';
import BackButton from '@/components/BackButton';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Plus, 
  Search, 
  Apple, 
  Droplet, 
  Zap, 
  Target, 
  Calendar,
  Clock,
  TrendingUp,
  BarChart3,
  Camera,
  Barcode,
  Edit,
  Trash2,
  Filter,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info,
  ChevronRight,
  ChevronLeft,
  MoreHorizontal
} from 'lucide-react';

interface DailySummary {
  totalCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  remainingCalories: number;
}

interface WeeklyData {
  date: string;
  calories: number;
}

interface NutritionGoals {
  calorieGoal: number;
  proteinGoal: number;
  carbGoal: number;
  fatGoal: number;
}

export default function Tracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMeal, setSelectedMeal] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');

  // Fetch daily summary
  const { data: dailySummary, isLoading: summaryLoading } = useQuery<DailySummary>({
    queryKey: ['/api/food-entries/daily'],
    enabled: !!user?.id,
  });

  // Fetch weekly data
  const { data: weeklyData, isLoading: weeklyLoading } = useQuery<WeeklyData[]>({
    queryKey: ['/api/food-entries/weekly'],
    enabled: !!user?.id,
  });

  // Fetch nutrition goals
  const { data: nutritionGoals, isLoading: goalsLoading } = useQuery<NutritionGoals>({
    queryKey: ['/api/nutrition-goals'],
    enabled: !!user?.id,
  });

  // Fetch food entries
  const { data: foodEntries, isLoading: entriesLoading } = useQuery<FoodEntryDocument[]>({
    queryKey: ['/api/food-entries'],
    enabled: !!user?.id,
  });

  // Delete food entry mutation
  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: number) => {
      await apiRequest('DELETE', `/api/food-entries/${entryId}`);
    },
    onSuccess: () => {
      toast({
        title: 'Entry deleted',
        description: 'Food entry has been removed from your log.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/food-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/food-entries/daily'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete food entry. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Filter entries based on search and meal type
  const filteredEntries = foodEntries?.filter(entry => {
    const matchesSearch = entry.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMeal = selectedMeal === 'all' || entry.mealType === selectedMeal;
    const entryDate = new Date(entry.timestamp);
    const matchesDate = entryDate.toDateString() === selectedDate.toDateString();
    return matchesSearch && matchesMeal && matchesDate;
  }) || [];

  // Calculate progress percentages
  const getProgressPercentage = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
  };

  // Get color based on progress
  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Quick add common foods
  const quickFoods = [
    { name: 'Apple', calories: 95, protein: 0.5, carbs: 25, fat: 0.3, mealType: 'snack' },
    { name: 'Banana', calories: 105, protein: 1.3, carbs: 27, fat: 0.4, mealType: 'snack' },
    { name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, mealType: 'lunch' },
    { name: 'Salmon', calories: 208, protein: 25, carbs: 0, fat: 12, mealType: 'dinner' },
    { name: 'Greek Yogurt', calories: 59, protein: 10, carbs: 3.6, fat: 0.4, mealType: 'breakfast' },
    { name: 'Quinoa', calories: 120, protein: 4.4, carbs: 22, fat: 1.9, mealType: 'lunch' },
  ];

  const handleQuickAdd = async (food: typeof quickFoods[0]) => {
    try {
      await apiRequest('POST', '/api/food-entries', {
        name: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        mealType: food.mealType,
        servingSize: '1 serving',
      });
      
      toast({
        title: 'Food added!',
        description: `${food.name} has been added to your log.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/food-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/food-entries/daily'] });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add food entry. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteEntry = (entryId: number) => {
    deleteEntryMutation.mutate(entryId);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen gradient-bg theme-transition flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground">Please log in to access the food tracker.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <BackButton />
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Food Tracker</h1>
                <p className="text-muted-foreground">Track your nutrition and stay on top of your health goals</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => queryClient.invalidateQueries()}
                disabled={summaryLoading || weeklyLoading || entriesLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${(summaryLoading || weeklyLoading || entriesLoading) ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Food
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Food Entry</DialogTitle>
                    <DialogDescription>
                      Log your food intake with accurate nutritional information
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4">
                    <FoodEntryForm />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center justify-between bg-card/50 rounded-lg p-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const newDate = new Date(selectedDate);
                newDate.setDate(newDate.getDate() - 1);
                setSelectedDate(newDate);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <h3 className="font-semibold text-foreground">{formatDate(selectedDate)}</h3>
              <p className="text-sm text-muted-foreground">
                {selectedDate.toDateString() === new Date().toDateString() ? 'Today' : 'Selected Date'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const newDate = new Date(selectedDate);
                newDate.setDate(newDate.getDate() + 1);
                setSelectedDate(newDate);
              }}
              disabled={selectedDate.toDateString() === new Date().toDateString()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Daily Summary Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="card-shadow theme-transition">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-foreground">Today's Nutrition</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        {summaryLoading ? 'Loading...' : `${dailySummary?.totalCalories || 0} calories consumed`}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {selectedDate.toDateString() === new Date().toDateString() ? 'Today' : 'Past Day'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Calories Progress */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Calories</span>
                      <span className="text-foreground font-medium">
                        {dailySummary?.totalCalories || 0} / {nutritionGoals?.calorieGoal || 2000}
                      </span>
                    </div>
                    <Progress 
                      value={getProgressPercentage(dailySummary?.totalCalories || 0, nutritionGoals?.calorieGoal || 2000)} 
                      className="h-3"
                    />
                    {dailySummary && nutritionGoals && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{dailySummary.remainingCalories} remaining</span>
                        <span>{Math.round(getProgressPercentage(dailySummary.totalCalories, nutritionGoals.calorieGoal))}% of goal</span>
                      </div>
                    )}
                  </div>

                  {/* Macronutrients Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-center p-4 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer">
                            <div className="flex items-center justify-center mb-2">
                              <Zap className="h-5 w-5 text-primary" />
                            </div>
                            <div className="text-lg font-semibold text-foreground">{dailySummary?.totalCalories || 0}</div>
                            <div className="text-xs text-muted-foreground">Calories</div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Total calories consumed today</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-center p-4 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors cursor-pointer">
                            <div className="flex items-center justify-center mb-2">
                              <Target className="h-5 w-5 text-blue-500" />
                            </div>
                            <div className="text-lg font-semibold text-foreground">{dailySummary?.protein || 0}g</div>
                            <div className="text-xs text-muted-foreground">Protein</div>
                            {nutritionGoals && (
                              <div className="text-xs text-blue-600 dark:text-blue-400">
                                {Math.round(getProgressPercentage(dailySummary?.protein || 0, nutritionGoals.proteinGoal))}%
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Protein: {dailySummary?.protein || 0}g / {nutritionGoals?.proteinGoal || 150}g</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-center p-4 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 transition-colors cursor-pointer">
                            <div className="flex items-center justify-center mb-2">
                              <Apple className="h-5 w-5 text-orange-500" />
                            </div>
                            <div className="text-lg font-semibold text-foreground">{dailySummary?.carbs || 0}g</div>
                            <div className="text-xs text-muted-foreground">Carbs</div>
                            {nutritionGoals && (
                              <div className="text-xs text-orange-600 dark:text-orange-400">
                                {Math.round(getProgressPercentage(dailySummary?.carbs || 0, nutritionGoals.carbGoal))}%
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Carbohydrates: {dailySummary?.carbs || 0}g / {nutritionGoals?.carbGoal || 250}g</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-center p-4 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors cursor-pointer">
                            <div className="flex items-center justify-center mb-2">
                              <Droplet className="h-5 w-5 text-yellow-500" />
                            </div>
                            <div className="text-lg font-semibold text-foreground">{dailySummary?.fat || 0}g</div>
                            <div className="text-xs text-muted-foreground">Fat</div>
                            {nutritionGoals && (
                              <div className="text-xs text-yellow-600 dark:text-yellow-400">
                                {Math.round(getProgressPercentage(dailySummary?.fat || 0, nutritionGoals.fatGoal))}%
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Fat: {dailySummary?.fat || 0}g / {nutritionGoals?.fatGoal || 65}g</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Add Foods */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="card-shadow theme-transition">
                <CardHeader>
                  <CardTitle className="text-foreground">Quick Add</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Add common foods with one click
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {quickFoods.map((food) => (
                      <Button
                        key={food.name}
                        variant="outline"
                        size="sm"
                        className="h-auto p-3 flex flex-col items-start"
                        onClick={() => handleQuickAdd(food)}
                      >
                        <span className="font-medium text-sm">{food.name}</span>
                        <span className="text-xs text-muted-foreground">{food.calories} cal</span>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {food.mealType}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Food Entries List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="card-shadow theme-transition">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-foreground">Food Entries</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        {filteredEntries.length} entries for {formatDate(selectedDate)}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search foods..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 w-48"
                        />
                      </div>
                      <Select value={selectedMeal} onValueChange={setSelectedMeal}>
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Meals</SelectItem>
                          <SelectItem value="breakfast">Breakfast</SelectItem>
                          <SelectItem value="lunch">Lunch</SelectItem>
                          <SelectItem value="dinner">Dinner</SelectItem>
                          <SelectItem value="snack">Snack</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {entriesLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-16 bg-muted rounded-lg"></div>
                        </div>
                      ))}
                    </div>
                  ) : filteredEntries.length === 0 ? (
                    <div className="text-center py-12">
                      <Apple className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No food entries</h3>
                      <p className="text-muted-foreground mb-4">
                        {searchTerm || selectedMeal !== 'all' 
                          ? 'No entries match your filters. Try adjusting your search.'
                          : 'Start tracking your nutrition by adding your first food entry.'
                        }
                      </p>
                      <Button onClick={() => setShowAddDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Entry
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredEntries.map((entry) => (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-all duration-300 group"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-medium text-foreground">{entry.name}</h3>
                              <Badge variant="outline" className="text-xs">
                                {entry.mealType}
                              </Badge>
                              {entry.servingSize && (
                                <span className="text-xs text-muted-foreground">
                                  {entry.servingSize}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                {entry.calories} cal
                              </span>
                              {entry.protein && (
                                <span className="flex items-center gap-1">
                                  <Target className="h-3 w-3" />
                                  {entry.protein}g protein
                                </span>
                              )}
                              {entry.carbs && (
                                <span className="flex items-center gap-1">
                                  <Apple className="h-3 w-3" />
                                  {entry.carbs}g carbs
                                </span>
                              )}
                              {entry.fat && (
                                <span className="flex items-center gap-1">
                                  <Droplet className="h-3 w-3" />
                                  {entry.fat}g fat
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm text-muted-foreground">
                              {formatTime(entry.timestamp)}
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Weekly Progress */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="card-shadow theme-transition">
                <CardHeader>
                  <CardTitle className="text-foreground">Weekly Overview</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    7-day calorie tracking
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {weeklyLoading ? (
                    <div className="space-y-2">
                      {[...Array(7)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-muted rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {weeklyData?.map((day, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                            </span>
                            <span className="text-foreground font-medium">
                              {day.calories} cal
                            </span>
                          </div>
                          <Progress 
                            value={getProgressPercentage(day.calories, nutritionGoals?.calorieGoal || 2000)} 
                            className="h-2"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Nutrition Insights */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <NutritionInsights
                dailyData={{
                  calories: dailySummary?.totalCalories || 0,
                  protein: dailySummary?.protein || 0,
                  carbs: dailySummary?.carbs || 0,
                  fat: dailySummary?.fat || 0,
                  fiber: 0, // Add fiber tracking if available
                  sugar: 0, // Add sugar tracking if available
                }}
                goals={{
                  calorieGoal: nutritionGoals?.calorieGoal || 2000,
                  proteinGoal: nutritionGoals?.proteinGoal || 150,
                  carbGoal: nutritionGoals?.carbGoal || 250,
                  fatGoal: nutritionGoals?.fatGoal || 65,
                }}
                weeklyData={weeklyData}
                isLoading={summaryLoading || goalsLoading}
              />
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <Card className="card-shadow theme-transition">
                <CardHeader>
                  <CardTitle className="text-foreground">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowAddDialog(true)}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Photo Analysis
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowAddDialog(true)}
                  >
                    <Barcode className="h-4 w-4 mr-2" />
                    Scan Barcode
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowAddDialog(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Manual Entry
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
