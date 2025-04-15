import { useAuth } from "../hooks/use-auth";
import { Button } from "../components/ui/button";
import { Link } from "wouter";
import { LogOut, User, Home } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "../lib/queryClient";
import { Suspense, lazy } from "react";
import DashboardBackground from "../components/DashboardBackground";
import DashboardSkeleton from "../components/DashboardSkeleton";

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
  
  return (
    <div className="min-h-screen relative">
      <DashboardBackground />
      
      <div className="relative z-20">
        <header className="border-b border-white/10 backdrop-blur-lg">
          <div className="container flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-2xl font-bold tracking-tight text-white hover:text-primary transition-colors flex items-center gap-2">
                <Home className="h-6 w-6" />
                NutriTrack
              </Link>
              <Link href="/profile" className="text-sm text-white/70 hover:text-primary transition-colors flex items-center gap-1">
                <User className="h-4 w-4" />
                Profile
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-white/70">
                Welcome, {user?.username}
              </span>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Log Out
              </Button>
            </div>
          </div>
        </header>
        
        <main className="container py-6">
          {isInitialLoading ? (
            <DashboardSkeleton />
          ) : (
            <Suspense fallback={<DashboardSkeleton />}>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* First column */}
                <div className="space-y-6">
                  <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10">
                    <DailySummary />
                  </div>
                  <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10">
                    <FoodEntryForm />
                  </div>
                </div>
                
                {/* Second column */}
                <div className="space-y-6">
                  <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10">
                    <NutritionChart />
                  </div>
                  <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10">
                    <NutrientBreakdownChart />
                  </div>
                </div>
                
                {/* Third column */}
                <div className="space-y-6 lg:col-span-1">
                  <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10">
                    <NutritionHighlights />
                  </div>
                  <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10">
                    <WeeklyCaloriesChart />
                  </div>
                  <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10">
                    <RecentFoodEntries />
                  </div>
                </div>
                
                {/* Full width sections */}
                <div className="md:col-span-2 lg:col-span-3 space-y-6">
                  <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10">
                    <AIRecommendations />
                  </div>
                  <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10">
                    <AIChatInterface />
                  </div>
                </div>
              </div>
            </Suspense>
          )}
        </main>
      </div>
    </div>
  );
}