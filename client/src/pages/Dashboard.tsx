import { useAuth } from "../hooks/use-auth";
import { Button } from "../components/ui/button";
import { Link } from "wouter";
import { LogOut, User, Plus, ChartBar, Brain, MessageSquare, Apple, Droplet, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "../lib/queryClient";
import { Suspense, lazy } from "react";
import DashboardBackground from "../components/DashboardBackground";
import DashboardSkeleton from "../components/DashboardSkeleton";
import { motion } from "framer-motion";
import { ThemeToggle } from "../components/ThemeToggle";

// Lazy load components
const RecentFoodEntries = lazy(() => import("../components/RecentFoodEntries"));
const FoodEntryForm = lazy(() => import("../components/FoodEntryForm"));
const NutritionChart = lazy(() => import("../components/NutritionChart"));
const DailySummary = lazy(() => import("../components/DailySummary"));
const NutritionHighlights = lazy(() => import("../components/NutritionHighlights"));
const AIRecommendations = lazy(() => import("../components/AIRecommendations"));
const WeeklyCaloriesChart = lazy(() => import("../components/WeeklyCaloriesChart"));
const AIChatInterface = lazy(() => import("../components/AIChatInterface"));
const NutrientBreakdownChart = lazy(() => import("../components/NutrientBreakdownChart"));

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  
  // Fetch initial data to determine loading state
  const { isLoading: isInitialLoading } = useQuery({
    queryKey: [`/api/food-entries/daily?userId=${user?.id}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user?.id
  });
  
  const handleLogout = () => {
    logoutMutation.mutate();
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
  
  return (
    <div className="min-h-screen relative bg-gradient-to-br from-background via-background/95 to-background/90">
      <DashboardBackground />
      
      <div className="relative z-20">
        <motion.header 
          className="border-b border-border/50 backdrop-blur-lg bg-background/80 sticky top-0 z-50"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="container flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-2xl font-bold tracking-tight text-white hover:text-primary transition-colors flex items-center gap-2 group">
                <Apple className="h-6 w-6 group-hover:scale-110 transition-transform" />
                <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">NutriTrack</span>
              </Link>
              <Link href="/profile" className="text-sm text-white/70 hover:text-primary transition-colors flex items-center gap-1 group">
                <User className="h-4 w-4 group-hover:scale-110 transition-transform" />
                Profile
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-white/70">
                Welcome, {user?.username}
              </span>
              <ThemeToggle />
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="bg-background/50 hover:bg-background/80 text-white border-border hover:border-primary/50 transition-all duration-300"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Log Out
              </Button>
            </div>
          </div>
        </motion.header>
        
        <main className="container py-8">
          {isInitialLoading ? (
            <DashboardSkeleton />
          ) : (
            <Suspense fallback={<DashboardSkeleton />}>
              <motion.div 
                className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {/* First column */}
                <motion.div className="space-y-8" variants={itemVariants}>
                  <motion.div 
                    className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-xl"
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Activity className="h-5 w-5 text-primary" />
                      </div>
                      <h2 className="text-lg font-semibold text-white">Daily Summary</h2>
                    </div>
                    <DailySummary />
                  </motion.div>
                  <motion.div 
                    className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-xl"
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Plus className="h-5 w-5 text-primary" />
                      </div>
                      <h2 className="text-lg font-semibold text-white">Add Food Entry</h2>
                    </div>
                    <FoodEntryForm />
                  </motion.div>
                </motion.div>
                
                {/* Second column */}
                <motion.div className="space-y-8" variants={itemVariants}>
                  <motion.div 
                    className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-xl"
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <ChartBar className="h-5 w-5 text-primary" />
                      </div>
                      <h2 className="text-lg font-semibold text-white">Nutrition Overview</h2>
                    </div>
                    <NutritionChart />
                  </motion.div>
                  <motion.div 
                    className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-xl"
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Droplet className="h-5 w-5 text-primary" />
                      </div>
                      <h2 className="text-lg font-semibold text-white">Nutrient Breakdown</h2>
                    </div>
                    <NutrientBreakdownChart />
                  </motion.div>
                </motion.div>
                
                {/* Third column */}
                <motion.div className="space-y-8 lg:col-span-1" variants={itemVariants}>
                  <motion.div 
                    className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-xl"
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Brain className="h-5 w-5 text-primary" />
                      </div>
                      <h2 className="text-lg font-semibold text-white">Nutrition Insights</h2>
                    </div>
                    <NutritionHighlights />
                  </motion.div>
                  <motion.div 
                    className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-xl"
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <ChartBar className="h-5 w-5 text-primary" />
                      </div>
                      <h2 className="text-lg font-semibold text-white">Weekly Progress</h2>
                    </div>
                    <WeeklyCaloriesChart />
                  </motion.div>
                  <motion.div 
                    className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-xl"
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <MessageSquare className="h-5 w-5 text-primary" />
                      </div>
                      <h2 className="text-lg font-semibold text-white">Recent Entries</h2>
                    </div>
                    <RecentFoodEntries />
                  </motion.div>
                </motion.div>
                
                {/* Full width sections */}
                <motion.div className="md:col-span-2 lg:col-span-3 space-y-8" variants={itemVariants}>
                  <motion.div 
                    className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-xl"
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Brain className="h-5 w-5 text-primary" />
                      </div>
                      <h2 className="text-lg font-semibold text-white">AI Recommendations</h2>
                    </div>
                    <AIRecommendations />
                  </motion.div>
                  <motion.div 
                    className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-xl"
                    whileHover={{ scale: 1.02, y: -5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <MessageSquare className="h-5 w-5 text-primary" />
                      </div>
                      <h2 className="text-lg font-semibold text-white">AI Chat Assistant</h2>
                    </div>
                    <AIChatInterface />
                  </motion.div>
                </motion.div>
              </motion.div>
            </Suspense>
          )}
        </main>
      </div>
    </div>
  );
}