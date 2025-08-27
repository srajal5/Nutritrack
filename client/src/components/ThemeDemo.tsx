import { motion } from "framer-motion";
import { ThemeToggle } from "./ThemeToggle";
import { useTheme } from "./ThemeProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Apple, Brain, ChartBar } from "lucide-react";

export function ThemeDemo() {
  const { theme, resolvedTheme } = useTheme();

  return (
    <div className="min-h-screen gradient-bg theme-transition p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.div 
          className="text-center space-y-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-foreground">
            Theme Toggle Demo
          </h1>
          <p className="text-lg text-muted-foreground">
            Current theme: <Badge variant="outline" className="ml-2">{theme}</Badge>
            {theme === "system" && (
              <span className="ml-2 text-sm text-muted-foreground">
                (resolved: {resolvedTheme})
              </span>
            )}
          </p>
          <div className="flex justify-center">
            <ThemeToggle />
          </div>
        </motion.div>

        {/* Theme Cards Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, staggerChildren: 0.1 }}
        >
          {/* Card 1 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="card-shadow theme-transition hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Apple className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-foreground">Food Tracking</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      AI-powered nutrition analysis
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Calories</span>
                    <span className="text-foreground font-medium">1,200 / 2,000</span>
                  </div>
                  <Progress value={60} className="h-2" />
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    Protein: 45g
                  </Badge>
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
                    Carbs: 150g
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="card-shadow theme-transition hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Brain className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-foreground">AI Insights</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Personalized recommendations
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Based on your recent meals, consider adding more leafy greens to increase your vitamin K intake.
                </p>
                <Button size="sm" className="w-full">
                  View Recommendations
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card 3 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="card-shadow theme-transition hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <ChartBar className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <CardTitle className="text-foreground">Progress</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Weekly nutrition goals
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Weekly Goal</span>
                    <span className="text-foreground font-medium">85%</span>
                  </div>
                  <Progress value={85} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-center p-2 rounded bg-muted/50">
                    <div className="font-medium text-foreground">Days</div>
                    <div className="text-muted-foreground">5/7</div>
                  </div>
                  <div className="text-center p-2 rounded bg-muted/50">
                    <div className="font-medium text-foreground">Streak</div>
                    <div className="text-muted-foreground">12 days</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Interactive Elements */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Card className="card-shadow theme-transition">
            <CardHeader>
              <CardTitle className="text-foreground">Interactive Elements</CardTitle>
              <CardDescription className="text-muted-foreground">
                Test the theme transitions with these interactive components
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="default">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="card-shadow theme-transition">
            <CardHeader>
              <CardTitle className="text-foreground">Color Palette</CardTitle>
              <CardDescription className="text-muted-foreground">
                Current theme color variables
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="h-8 rounded bg-background border border-border"></div>
                  <p className="text-xs text-muted-foreground">Background</p>
                </div>
                <div className="space-y-2">
                  <div className="h-8 rounded bg-foreground"></div>
                  <p className="text-xs text-muted-foreground">Foreground</p>
                </div>
                <div className="space-y-2">
                  <div className="h-8 rounded bg-primary"></div>
                  <p className="text-xs text-muted-foreground">Primary</p>
                </div>
                <div className="space-y-2">
                  <div className="h-8 rounded bg-muted"></div>
                  <p className="text-xs text-muted-foreground">Muted</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Theme Info */}
        <motion.div 
          className="text-center space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <Card className="card-shadow theme-transition max-w-2xl mx-auto">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Theme Features
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1 text-left">
                <li>• Smooth transitions between light and dark modes</li>
                <li>• System theme detection and automatic switching</li>
                <li>• Persistent theme preference storage</li>
                <li>• Enhanced visual feedback and animations</li>
                <li>• Glass morphism effects and improved shadows</li>
                <li>• Consistent color palette across all components</li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
