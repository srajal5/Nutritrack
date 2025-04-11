import { useRef, useEffect } from 'react';
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

// Feature card icons
const featureCardData = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    title: "AI-Powered Food Analysis",
    description: "Our AI analyzes your food entries to provide accurate calorie counts and detailed nutritional breakdowns.",
    bgColorClass: "bg-primary/10",
    iconColorClass: "text-primary"
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    title: "AI Fitness Coach",
    description: "Chat with our AI fitness coach for personalized workout advice, nutritional guidance, and motivation.",
    bgColorClass: "bg-blue-500/10",
    iconColorClass: "text-blue-500"
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
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
    <div className="flex flex-col min-h-screen">
      <Header />
      
      {/* Hero Section with 3D Visualization */}
      <section id="home" className="relative h-[600px] flex items-center overflow-hidden">
        <ThreeJSCanvas />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-900/40 to-primary/20"></div>
        <div className="container mx-auto px-6 z-10">
          <div className="max-w-lg">
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-white leading-tight mb-4">
              Track Calories & Get AI Fitness Advice
            </h2>
            <p className="text-white/90 text-lg mb-8">
              Use AI to accurately track calories, analyze nutrition, and get personalized fitness recommendations in real-time.
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <Button
                className="bg-primary hover:bg-primary-dark text-white font-medium py-3 px-6 rounded-lg transition-colors text-center"
                onClick={() => scrollToSection(trackerRef)}
              >
                Start Tracking
              </Button>
              <Button
                variant="outline"
                className="bg-white hover:bg-neutral-100 text-primary font-medium py-3 px-6 rounded-lg transition-colors text-center"
                onClick={() => scrollToSection(aiChatRef)}
              >
                Chat with AI Coach
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="font-heading text-3xl font-bold text-center mb-12">Smart Nutrition & Fitness Tracking</h2>
          
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
      <section id="tracker" ref={trackerRef} className="py-16 bg-neutral-50">
        <div className="container mx-auto px-6">
          <h2 className="font-heading text-3xl font-bold text-center mb-12">Smart Calorie Tracker</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Food Entry Form */}
            <div className="lg:col-span-1">
              <FoodEntryForm />
            </div>
            
            {/* Daily Summary */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Calorie Summary Card */}
              <DailySummary />
              
              {/* Nutrition Chart Card */}
              <NutritionChart />
              
              {/* Recent Entries */}
              <div className="md:col-span-2">
                <RecentFoodEntries />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Chat Section */}
      <section id="ai-chat" ref={aiChatRef} className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="font-heading text-3xl font-bold text-center mb-12">Your AI Fitness Coach</h2>
          <AIChatInterface />
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" ref={statsRef} className="py-16 bg-neutral-50">
        <div className="container mx-auto px-6">
          <h2 className="font-heading text-3xl font-bold text-center mb-12">Your Nutrition Insights</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Weekly Calories Chart */}
            <WeeklyCaloriesChart />
            
            {/* Nutrient Distribution Chart */}
            <NutrientBreakdownChart />
            
            {/* Nutrition Highlights */}
            <NutritionHighlights />
            
            {/* Recommendations */}
            <AIRecommendations />
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
