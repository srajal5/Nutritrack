import { useAuth } from "../hooks/use-auth";
import RecentFoodEntries from "../components/RecentFoodEntries";
import FoodEntryForm from "../components/FoodEntryForm";
import NutritionChart from "../components/NutritionChart";
import DailySummary from "../components/DailySummary";
import NutritionHighlights from "../components/NutritionHighlights";
import AIRecommendations from "../components/AIRecommendations";
import WeeklyCaloriesChart from "../components/WeeklyCaloriesChart";
import AIChatInterface from "../components/AIChatInterface";
import NutrientBreakdownChart from "../components/NutrientBreakdownChart";
import { Button } from "../components/ui/button";
import { Link } from "wouter";

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex items-center justify-between py-4">
          <h1 className="text-2xl font-bold tracking-tight">NutriTrack Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.username}
            </span>
            <Button variant="outline" onClick={handleLogout}>
              Log Out
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container py-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* First column */}
          <div className="space-y-6">
            <DailySummary />
            <FoodEntryForm />
          </div>
          
          {/* Second column */}
          <div className="space-y-6">
            <NutritionChart />
            <NutrientBreakdownChart />
          </div>
          
          {/* Third column */}
          <div className="space-y-6 lg:col-span-1">
            <NutritionHighlights />
            <WeeklyCaloriesChart />
            <RecentFoodEntries />
          </div>
          
          {/* Full width sections */}
          <div className="md:col-span-2 lg:col-span-3 space-y-6">
            <AIRecommendations />
            <AIChatInterface />
          </div>
        </div>
      </main>
    </div>
  );
}