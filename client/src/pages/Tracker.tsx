import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { usePlan } from '@/hooks/use-plan';
import { FoodEntryDocument } from '@/types';
import FoodEntryForm from '@/components/FoodEntryForm';
import NutritionInsights from '@/components/NutritionInsights';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Plus,
  Search,
  Apple,
  Droplet,
  Zap,
  Target,
  Camera,
  Barcode,
  Edit,
  Trash2,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface DailySummary {
  totalCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
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
  fiberGoal: number;
  sugarGoal: number;
}

export default function Tracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMeal, setSelectedMeal] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Targets and today's totals come from the canonical plan, the same object
  // the Dashboard and Profile render. Tracker used to fetch /api/nutrition-goals
  // separately and fall back to `|| 2000` / `|| 150`, which is how it could show
  // different targets than the Dashboard for the same user.
  const { plan, today, isLoading: planLoading } = usePlan();
  const summaryLoading = planLoading;
  const goalsLoading = planLoading;

  const dailySummary: DailySummary | undefined = today
    ? {
        totalCalories: Math.round(today.calories),
        protein: Math.round(today.protein),
        carbs: Math.round(today.carbs),
        fat: Math.round(today.fat),
        fiber: Math.round(today.fiber),
        sugar: Math.round(today.sugar),
        remainingCalories: plan ? Math.max(0, plan.targets.calories - Math.round(today.calories)) : 0,
      }
    : undefined;

  const nutritionGoals: NutritionGoals | undefined = plan
    ? {
        calorieGoal: plan.targets.calories,
        proteinGoal: plan.targets.proteinGrams,
        carbGoal: plan.targets.carbsGrams,
        fatGoal: plan.targets.fatGrams,
        fiberGoal: plan.targets.fiberGrams,
        sugarGoal: 50,
      }
    : undefined;

  // Fetch weekly data
  const { data: weeklyData, isLoading: weeklyLoading } = useQuery<WeeklyData[]>({
    queryKey: ['/api/food-entries/weekly'],
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
      queryClient.invalidateQueries({ queryKey: ['/api/food-entries/weekly'] });
      queryClient.invalidateQueries({ queryKey: ['/api/food-entries/recent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/dashboard')
      });
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
    const entryDate = new Date(entry.entryDate || entry.createdAt || new Date());
    const matchesDate = entryDate.toDateString() === selectedDate.toDateString();
    return matchesSearch && matchesMeal && matchesDate;
  }) || [];

  // Calculate progress percentages
  const getProgressPercentage = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
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
      <div className="min-h-screen bg-background flex items-center justify-center">
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
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 md:pb-8">
        {/* Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
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
                    <FoodEntryForm onSuccess={() => setShowAddDialog(false)} />
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
          <div className="lg:col-span-2 space-y-6 min-w-0">
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
                        {dailySummary?.totalCalories || 0} / {nutritionGoals?.calorieGoal ?? '—'}
                      </span>
                    </div>
                    <Progress 
                      value={getProgressPercentage(dailySummary?.totalCalories || 0, nutritionGoals?.calorieGoal ?? 0)} 
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
                          <p>Protein: {dailySummary?.protein || 0}g / {nutritionGoals?.proteinGoal ?? '—'}g</p>
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
                          <p>Carbohydrates: {dailySummary?.carbs || 0}g / {nutritionGoals?.carbGoal ?? '—'}g</p>
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
                          <p>Fat: {dailySummary?.fat || 0}g / {nutritionGoals?.fatGoal ?? '—'}g</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-center p-4 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors cursor-pointer">
                            <div className="flex items-center justify-center mb-2">
                              <Apple className="h-5 w-5 text-green-500" />
                            </div>
                            <div className="text-lg font-semibold text-foreground">{dailySummary?.fiber || 0}g</div>
                            <div className="text-xs text-muted-foreground">Fiber</div>
                            {nutritionGoals && (
                              <div className="text-xs text-green-600 dark:text-green-400">
                                {Math.round(getProgressPercentage(dailySummary?.fiber || 0, nutritionGoals.fiberGoal || 25))}%
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Fiber: {dailySummary?.fiber || 0}g / {nutritionGoals?.fiberGoal || 25}g</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-center p-4 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors cursor-pointer">
                            <div className="flex items-center justify-center mb-2">
                              <Droplet className="h-5 w-5 text-red-500" />
                            </div>
                            <div className="text-lg font-semibold text-foreground">{dailySummary?.sugar || 0}g</div>
                            <div className="text-xs text-muted-foreground">Sugar</div>
                            {nutritionGoals && (
                              <div className="text-xs text-red-600 dark:text-red-400">
                                {Math.round(getProgressPercentage(dailySummary?.sugar || 0, nutritionGoals.sugarGoal || 50))}%
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Sugar: {dailySummary?.sugar || 0}g / {nutritionGoals?.sugarGoal || 50}g</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Food Logging Input Area */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  </div>
                  <Input
                    type="text"
                    className="w-full pl-12 pr-4 py-6 text-lg rounded-2xl border-border bg-card shadow-sm hover:border-primary/50 focus:border-primary transition-all"
                    placeholder="Search foods, scan barcode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-2 flex items-center">
                    <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setShowAddDialog(true)}>
                      <Barcode className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                    </Button>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    className="py-6 rounded-2xl bg-card border-border hover:bg-primary/5 hover:border-primary/30 transition-all flex items-center justify-center gap-2"
                    onClick={() => setShowAddDialog(true)}
                  >
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Camera className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-semibold">Scan Meal</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="py-6 rounded-2xl bg-card border-border hover:bg-primary/5 hover:border-primary/30 transition-all flex items-center justify-center gap-2"
                    onClick={() => {
                      toast({ title: "Coming soon", description: "Voice logging will be available in a future update." });
                    }}
                  >
                    <div className="bg-blue-500/10 p-2 rounded-full">
                      <span className="text-xl leading-none">🎤</span>
                    </div>
                    <span className="font-semibold">Voice Log</span>
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Food Entries List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-8"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">Recent</h2>
                <div className="flex gap-2">
                  <Select value={selectedMeal} onValueChange={setSelectedMeal}>
                    <SelectTrigger className="w-32 rounded-xl h-9">
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

              {entriesLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-muted rounded-2xl"></div>
                    </div>
                  ))}
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-3xl border border-border">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Apple className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">No food entries</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                    {searchTerm || selectedMeal !== 'all' 
                      ? 'No entries match your filters. Try adjusting your search.'
                      : 'Start tracking your nutrition by adding your first food entry today.'
                    }
                  </p>
                  <Button onClick={() => setShowAddDialog(true)} className="rounded-xl px-8">
                    <Plus className="h-4 w-4 mr-2" />
                    Log Food
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEntries.map((entry) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/30 shadow-sm transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center text-2xl">
                          {entry.name.toLowerCase().includes('apple') ? '🍎' : 
                           entry.name.toLowerCase().includes('sandwich') || entry.name.toLowerCase().includes('bread') ? '🥪' : 
                           entry.name.toLowerCase().includes('chicken') || entry.name.toLowerCase().includes('meat') ? '🍗' : 
                           entry.name.toLowerCase().includes('salad') || entry.name.toLowerCase().includes('green') ? '🥗' : 
                           entry.name.toLowerCase().includes('water') || entry.name.toLowerCase().includes('drink') ? '💧' : '🍽️'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground text-base">{entry.name}</h3>
                            {entry.servingSize && (
                              <span className="text-xs text-muted-foreground">({entry.servingSize})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center text-foreground font-medium">
                              {entry.calories} kcal
                            </span>
                            <span className="w-1 h-1 rounded-full bg-border"></span>
                            <span className="capitalize">{entry.mealType}</span>
                            <span className="w-1 h-1 rounded-full bg-border"></span>
                            <span>{formatTime(entry.entryDate || entry.createdAt || '')}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 min-w-0">
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
                            value={getProgressPercentage(day.calories, nutritionGoals?.calorieGoal ?? 0)} 
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
                  fiber: dailySummary?.fiber || 0,
                  sugar: dailySummary?.sugar || 0,
                }}
                goals={{
                  calorieGoal: nutritionGoals?.calorieGoal ?? 0,
                  proteinGoal: nutritionGoals?.proteinGoal ?? 0,
                  carbGoal: nutritionGoals?.carbGoal ?? 0,
                  fatGoal: nutritionGoals?.fatGoal ?? 0,
                  fiberGoal: nutritionGoals?.fiberGoal ?? 0,
                  sugarGoal: nutritionGoals?.sugarGoal ?? 0,
                }}
                weeklyData={weeklyData}
                isLoading={summaryLoading || goalsLoading || weeklyLoading}
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
