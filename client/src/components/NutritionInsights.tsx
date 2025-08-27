import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// Removed unused Progress import
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Lightbulb,
  Sparkles,
  Apple,
  Droplet
} from 'lucide-react';
import { motion } from 'framer-motion';

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
}

interface NutritionGoals {
  calorieGoal: number;
  proteinGoal: number;
  carbGoal: number;
  fatGoal: number;
}

interface Insight {
  type: 'positive' | 'warning' | 'info' | 'suggestion';
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: string;
  priority: number;
}

interface NutritionInsightsProps {
  dailyData: NutritionData;
  goals: NutritionGoals;
  weeklyData?: Array<{ date: string; calories: number }>;
  isLoading?: boolean;
}

const NutritionInsights = ({ dailyData, goals, weeklyData, isLoading = false }: NutritionInsightsProps) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [showAllInsights, setShowAllInsights] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    const newInsights: Insight[] = [];

    // Calorie analysis
    const caloriePercentage = (dailyData.calories / goals.calorieGoal) * 100;
    if (caloriePercentage < 70) {
      newInsights.push({
        type: 'warning',
        title: 'Low Calorie Intake',
        description: `You've consumed ${Math.round(caloriePercentage)}% of your daily calorie goal. Consider adding a healthy snack.`,
        icon: <TrendingDown className="h-4 w-4" />,
        action: 'Add a healthy snack',
        priority: 1
      });
    } else if (caloriePercentage > 120) {
      newInsights.push({
        type: 'warning',
        title: 'High Calorie Intake',
        description: `You're ${Math.round(caloriePercentage - 100)}% over your daily calorie goal. Consider lighter options for remaining meals.`,
        icon: <TrendingUp className="h-4 w-4" />,
        action: 'Choose lighter options',
        priority: 2
      });
    } else if (caloriePercentage >= 90 && caloriePercentage <= 110) {
      newInsights.push({
        type: 'positive',
        title: 'Great Calorie Balance',
        description: 'You\'re maintaining a healthy calorie balance today!',
        icon: <CheckCircle className="h-4 w-4" />,
        priority: 3
      });
    }

    // Protein analysis
    const proteinPercentage = (dailyData.protein / goals.proteinGoal) * 100;
    if (proteinPercentage < 60) {
      newInsights.push({
        type: 'warning',
        title: 'Low Protein Intake',
        description: `You've consumed ${Math.round(proteinPercentage)}% of your protein goal. Add protein-rich foods like chicken, fish, or legumes.`,
        icon: <Target className="h-4 w-4" />,
        action: 'Add protein-rich foods',
        priority: 1
      });
    } else if (proteinPercentage >= 80) {
      newInsights.push({
        type: 'positive',
        title: 'Good Protein Intake',
        description: 'You\'re meeting your protein goals well!',
        icon: <CheckCircle className="h-4 w-4" />,
        priority: 4
      });
    }

    // Macro balance analysis
    const totalMacros = dailyData.protein + dailyData.carbs + dailyData.fat;
    if (totalMacros > 0) {
      const proteinRatio = (dailyData.protein * 4 / dailyData.calories) * 100;
      const fatRatio = (dailyData.fat * 9 / dailyData.calories) * 100;

      if (proteinRatio < 10) {
        newInsights.push({
          type: 'suggestion',
          title: 'Increase Protein Ratio',
          description: 'Your protein intake is only 10% of calories. Aim for 15-25% for better muscle maintenance.',
          icon: <Target className="h-4 w-4" />,
          action: 'Add more protein',
          priority: 2
        });
      }

      if (fatRatio > 40) {
        newInsights.push({
          type: 'suggestion',
          title: 'High Fat Intake',
          description: 'Your fat intake is over 40% of calories. Consider reducing for better balance.',
          icon: <Droplet className="h-4 w-4" />,
          action: 'Reduce fat intake',
          priority: 2
        });
      }
    }

    // Fiber analysis
    if (dailyData.fiber < 25) {
      newInsights.push({
        type: 'suggestion',
        title: 'Low Fiber Intake',
        description: 'Add more fruits, vegetables, and whole grains to reach the recommended 25g of fiber daily.',
        icon: <Apple className="h-4 w-4" />,
        action: 'Add fiber-rich foods',
        priority: 3
      });
    }

    // Sugar analysis
    if (dailyData.sugar > 50) {
      newInsights.push({
        type: 'warning',
        title: 'High Sugar Intake',
        description: 'Your sugar intake is above recommended levels. Consider reducing added sugars.',
        icon: <AlertTriangle className="h-4 w-4" />,
        action: 'Reduce sugar intake',
        priority: 2
      });
    }

    // Weekly trend analysis
    if (weeklyData && weeklyData.length >= 3) {
      const recentCalories = weeklyData.slice(-3).map(d => d.calories);
      const avgCalories = recentCalories.reduce((a, b) => a + b, 0) / recentCalories.length;
      
      if (avgCalories < goals.calorieGoal * 0.8) {
        newInsights.push({
          type: 'info',
          title: 'Consistent Low Intake',
          description: 'You\'ve been consistently below your calorie goals this week. Consider adjusting your meal planning.',
          icon: <Info className="h-4 w-4" />,
          priority: 3
        });
      } else if (avgCalories > goals.calorieGoal * 1.2) {
        newInsights.push({
          type: 'warning',
          title: 'Consistent High Intake',
          description: 'You\'ve been consistently above your calorie goals this week. Review your portion sizes.',
          icon: <TrendingUp className="h-4 w-4" />,
          priority: 2
        });
      }
    }

    // General health tips
    if (dailyData.calories > 0) {
      newInsights.push({
        type: 'suggestion',
        title: 'Stay Hydrated',
        description: 'Remember to drink plenty of water throughout the day for optimal health.',
        icon: <Droplet className="h-4 w-4" />,
        action: 'Drink water',
        priority: 5
      });
    }

    // Sort insights by priority
    newInsights.sort((a, b) => a.priority - b.priority);
    setInsights(newInsights);
  }, [dailyData, goals, weeklyData, isLoading]);

  const getInsightColor = (type: Insight['type']) => {
    switch (type) {
      case 'positive':
        return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
      case 'suggestion':
        return 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200';
      default:
        return 'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200';
    }
  };

  const getInsightIconColor = (type: Insight['type']) => {
    switch (type) {
      case 'positive':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'info':
        return 'text-blue-600 dark:text-blue-400';
      case 'suggestion':
        return 'text-purple-600 dark:text-purple-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const displayedInsights = showAllInsights ? insights : insights.slice(0, 3);

  if (isLoading) {
    return (
      <Card className="card-shadow theme-transition">
        <CardHeader>
          <CardTitle className="text-foreground">Nutrition Insights</CardTitle>
          <CardDescription className="text-muted-foreground">
            AI-powered recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-muted rounded-lg"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-shadow theme-transition">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Nutrition Insights
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              AI-powered recommendations based on your data
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {insights.length} insights
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Add more food entries to get personalized insights</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {displayedInsights.map((insight, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-3 rounded-lg border ${getInsightColor(insight.type)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${getInsightIconColor(insight.type)}`}>
                      {insight.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{insight.title}</p>
                      <p className="text-xs mt-1 opacity-90">{insight.description}</p>
                      {insight.action && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 h-6 text-xs"
                        >
                          {insight.action}
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {insights.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllInsights(!showAllInsights)}
                className="w-full"
              >
                {showAllInsights ? 'Show Less' : `Show ${insights.length - 3} More Insights`}
              </Button>
            )}
          </>
        )}

        {/* Quick Stats */}
        <div className="pt-4 border-t border-border/50">
          <h4 className="text-sm font-medium mb-3">Today's Summary</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 rounded bg-muted/50">
              <div className="text-lg font-semibold text-foreground">
                {Math.round((dailyData.calories / goals.calorieGoal) * 100)}%
              </div>
              <div className="text-xs text-muted-foreground">Calorie Goal</div>
            </div>
            <div className="text-center p-2 rounded bg-muted/50">
              <div className="text-lg font-semibold text-foreground">
                {Math.round((dailyData.protein / goals.proteinGoal) * 100)}%
              </div>
              <div className="text-xs text-muted-foreground">Protein Goal</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NutritionInsights;
