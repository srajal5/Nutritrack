import { useRef } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileNav from '@/components/MobileNav';
import ThreeJSCanvas from '@/components/ThreeJSCanvas';
import FoodEntryForm from '@/components/FoodEntryForm';
import DailySummary from '@/components/DailySummary';
import NutritionChart from '@/components/NutritionChart';
import RecentFoodEntries from '@/components/RecentFoodEntries';
import AIChatInterface from '@/components/AIChatInterface';
import WeeklyCaloriesChart from '@/components/WeeklyCaloriesChart';
import NutrientBreakdownChart from '@/components/NutrientBreakdownChart';
import NutritionHighlights from '@/components/NutritionHighlights';
import AIRecommendations from '@/components/AIRecommendations';
import FoodGallery from '@/components/FoodGallery';
import FeatureCard from '@/components/FeatureCard';
import { Button } from '@/components/ui/button';
import { Apple, Brain, ChartBar, Droplet, Activity } from 'lucide-react';

// Feature card icons
const featureCardData = [
  {
    icon: <Apple className="h-6 w-6" />,
    title: "AI-Powered Food Analysis",
    description: "Our AI analyzes your food entries to provide accurate calorie counts and detailed nutritional breakdowns.",
    bgColorClass: "bg-primary/10",
    iconColorClass: "text-primary"
  },
  {
    icon: <Brain className="h-6 w-6" />,
    title: "AI Fitness Coach",
    description: "Chat with our AI fitness coach for personalized workout advice, nutritional guidance, and motivation.",
    bgColorClass: "bg-blue-500/10",
    iconColorClass: "text-blue-500"
  },
  {
    icon: <ChartBar className="h-6 w-6" />,
    title: "Visual Progress Tracking",
    description: "Track your nutritional journey with interactive charts and insightful statistics that show your progress.",
    bgColorClass: "bg-orange-500/10",
    iconColorClass: "text-orange-500"
  }
];

const Home = () => {
  const trackerRef = useRef<HTMLDivElement>(null);
  const aiChatRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  // Handle smooth scrolling to sections
  const scrollToSection = (sectionRef: React.RefObject<HTMLDivElement>) => {
    sectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      
      {/* Hero Section with 3D Visualization */}
      <section id="home" className="relative h-[600px] flex items-center overflow-hidden">
        <ThreeJSCanvas />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-primary/20"></div>
        <div className="container mx-auto px-6 z-10">
          <div className="max-w-lg">
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
              Track Calories & Get AI Fitness Advice
            </h2>
            <p className="text-white/70 text-lg mb-8">
              Use AI to accurately track calories, analyze nutrition, and get personalized fitness recommendations in real-time.
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-6 rounded-lg transition-colors text-center"
                onClick={() => scrollToSection(trackerRef)}
              >
                Start Tracking
              </Button>
              <Button
                variant="outline"
                className="bg-background/50 hover:bg-background/80 text-foreground border-border font-medium py-3 px-6 rounded-lg transition-colors text-center"
                onClick={() => scrollToSection(aiChatRef)}
              >
                Chat with AI Coach
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-6">
          <h2 className="font-heading text-3xl font-bold text-center mb-12 text-white">Smart Nutrition & Fitness Tracking</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featureCardData.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                bgColorClass={feature.bgColorClass}
                iconColorClass={feature.iconColorClass}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Food Tracker Section */}
      <section id="tracker" ref={trackerRef} className="py-16 bg-background">
        <div className="container mx-auto px-6">
          <h2 className="font-heading text-3xl font-bold text-center mb-12 text-white">Smart Calorie Tracker</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Food Entry Form */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-xl p-6 border border-border shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-white">Add Food Entry</h3>
                </div>
                <FoodEntryForm />
              </div>
            </div>
            
            {/* Daily Summary */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Calorie Summary Card */}
              <div className="bg-card rounded-xl p-6 border border-border shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <ChartBar className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-white">Daily Summary</h3>
                </div>
                <DailySummary />
              </div>
              
              {/* Nutrition Chart Card */}
              <div className="bg-card rounded-xl p-6 border border-border shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Droplet className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-white">Nutrition Chart</h3>
                </div>
                <NutritionChart />
              </div>
              
              {/* Recent Entries */}
              <div className="md:col-span-2">
                <div className="bg-card rounded-xl p-6 border border-border shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <Apple className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-white">Recent Entries</h3>
                  </div>
                  <RecentFoodEntries />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Chat Section */}
      <section id="ai-chat" ref={aiChatRef} className="py-16 bg-card">
        <div className="container mx-auto px-6">
          <h2 className="font-heading text-3xl font-bold text-center mb-12 text-white">Your AI Fitness Coach</h2>
          <div className="bg-background rounded-xl p-6 border border-border shadow-lg">
            <AIChatInterface />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" ref={statsRef} className="py-16 bg-background">
        <div className="container mx-auto px-6">
          <h2 className="font-heading text-3xl font-bold text-center mb-12 text-white">Your Nutrition Insights</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Weekly Calories Chart */}
            <div className="bg-card rounded-xl p-6 border border-border shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <ChartBar className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-white">Weekly Progress</h3>
              </div>
              <WeeklyCaloriesChart />
            </div>
            
            {/* Nutrient Distribution Chart */}
            <div className="bg-card rounded-xl p-6 border border-border shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <Droplet className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-white">Nutrient Distribution</h3>
              </div>
              <NutrientBreakdownChart />
            </div>
            
            {/* Nutrition Highlights */}
            <div className="bg-card rounded-xl p-6 border border-border shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-white">Nutrition Highlights</h3>
              </div>
              <NutritionHighlights />
            </div>
            
            {/* Recommendations */}
            <div className="bg-card rounded-xl p-6 border border-border shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-white">AI Recommendations</h3>
              </div>
              <AIRecommendations />
            </div>
          </div>
        </div>
      </section>

      {/* Food Gallery */}
      <FoodGallery />

      <Footer />
      <MobileNav />
    </div>
  );
};

export default Home;
