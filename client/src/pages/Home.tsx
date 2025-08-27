import { useRef } from 'react';
import { Link } from 'wouter';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileNav from '@/components/MobileNav';
import { motion } from 'framer-motion';
import FoodEntryForm from '@/components/FoodEntryForm';
import { Apple, Brain, ChartBar, Droplet, Activity, Sparkles, Target, Zap } from 'lucide-react';

// Feature card icons with enhanced data
const featureCardData = [
  {
    icon: <Apple className="h-8 w-8" />,
    title: "AI-Powered Food Analysis",
    description: "Our AI analyzes your food entries to provide accurate calorie counts and detailed nutritional breakdowns.",
    bgColorClass: "bg-gradient-to-br from-primary/20 to-primary/5",
    iconColorClass: "text-primary",
    gradient: "from-primary to-primary/70"
  },
  {
    icon: <Brain className="h-8 w-8" />,
    title: "AI Fitness Coach",
    description: "Chat with our AI fitness coach for personalized workout advice, nutritional guidance, and motivation.",
    bgColorClass: "bg-gradient-to-br from-blue-500/20 to-blue-500/5",
    iconColorClass: "text-blue-500",
    gradient: "from-blue-500 to-blue-700"
  },
  {
    icon: <ChartBar className="h-8 w-8" />,
    title: "Visual Progress Tracking",
    description: "Track your nutritional journey with interactive charts and insightful statistics that show your progress.",
    bgColorClass: "bg-gradient-to-br from-orange-500/20 to-orange-500/5",
    iconColorClass: "text-orange-500",
    gradient: "from-orange-500 to-orange-700"
  }
];

const Home = () => {
  const scrollToFeatures = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 via-base-200 to-base-300">
      <Header />
      
      {/* Hero Section with 3D effects */}
      <section className="relative overflow-hidden min-h-screen flex items-center">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <motion.div
            animate={{ 
              rotate: 360,
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 20, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-r from-primary/30 to-secondary/30 rounded-full blur-xl"
          />
          <motion.div
            animate={{ 
              rotate: -360,
              scale: [1.1, 1, 1.1]
            }}
            transition={{ 
              duration: 25, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-r from-accent/30 to-primary/30 rounded-full blur-xl"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            {/* Main heading with 3D text effect */}
            <motion.h1 
              className="text-5xl md:text-7xl font-bold mb-6 text-center"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <span className="text-primary">
                Track Your
              </span>
              <br />
              <span className="text-primary">
                Nutrition
              </span>
              <br />
              <span className="text-4xl md:text-5xl text-primary">
                AI-Powered
              </span>
            </motion.h1>

            <motion.p 
              className="text-xl md:text-2xl text-base-content/80 mb-8 max-w-4xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Smart calorie tracking with AI-powered food analysis, personalized recommendations, and beautiful visualizations to help you achieve your health goals.
            </motion.p>

            {/* Enhanced CTA buttons with 3D effects */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-6 justify-center items-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                className="group"
              >
                <Link href="/auth">
                  <button className="btn btn-primary btn-lg gap-3 shadow-2xl hover:shadow-primary/50 transition-all duration-300 transform group-hover:-translate-y-1">
                    <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    Get Started
                  </button>
                </Link>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                className="group"
              >
                <button 
                  className="btn btn-outline btn-lg gap-3 shadow-xl hover:shadow-lg transition-all duration-300 transform group-hover:-translate-y-1 border-2"
                  onClick={() => scrollToFeatures.current?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <Target className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Learn More
                </button>
              </motion.div>
            </motion.div>

            {/* Floating stats */}
            <motion.div 
              className="flex justify-center gap-8 mt-16"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              {[
                { number: "10K+", label: "Active Users", icon: <Zap className="w-5 h-5" /> },
                { number: "99%", label: "Accuracy", icon: <Target className="w-5 h-5" /> },
                { number: "24/7", label: "AI Support", icon: <Brain className="w-5 h-5" /> }
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  className="text-center group"
                  whileHover={{ scale: 1.1, y: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="text-3xl font-bold text-primary group-hover:text-secondary transition-colors">
                    {stat.number}
                  </div>
                  <div className="text-sm text-base-content/70 flex items-center justify-center gap-1">
                    {stat.icon}
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section with enhanced cards */}
      <section ref={scrollToFeatures} className="py-24 bg-base-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-base-content mb-6">
              Why Choose <span className="text-primary">NutriTrackAI</span>?
            </h2>
            <p className="text-xl text-base-content/70 max-w-3xl mx-auto leading-relaxed">
              Our AI-powered platform makes nutrition tracking effortless and insightful
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {featureCardData.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05, y: -10 }}
                className="group"
              >
                <div className={`card bg-base-200 shadow-xl hover:shadow-2xl transition-all duration-500 border border-base-300 ${feature.bgColorClass}`}>
                  <div className="card-body text-center p-8">
                    <motion.div
                      className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${feature.bgColorClass} group-hover:scale-110 transition-transform duration-300`}
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <div className={feature.iconColorClass}>
                        {feature.icon}
                      </div>
                    </motion.div>
                    <h3 className="card-title text-xl font-bold text-base-content mb-3 justify-center">
                      {feature.title}
                    </h3>
                    <p className="text-base-content/70 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Section with enhanced design */}
      <section className="py-24 bg-gradient-to-br from-base-200 to-base-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-base-content mb-6">
              See It In <span className="text-primary">Action</span>
            </h2>
            <p className="text-xl text-base-content/70">
              Experience the power of AI-driven nutrition tracking
            </p>
          </motion.div>
          
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              className="space-y-8"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h3 className="text-3xl font-bold text-base-content">
                Smart Food Analysis
              </h3>
              <p className="text-lg text-base-content/70 leading-relaxed">
                Simply describe what you ate, and our AI will analyze it to provide accurate nutritional information, including calories, macronutrients, and micronutrients.
              </p>
              
              {/* Feature highlights */}
              <div className="space-y-4">
                {[
                  { icon: <Droplet className="h-6 w-6" />, text: "Hydration tracking", color: "text-blue-500" },
                  { icon: <Activity className="h-6 w-6" />, text: "Activity monitoring", color: "text-green-500" },
                  { icon: <Target className="h-6 w-6" />, text: "Goal setting", color: "text-purple-500" }
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center space-x-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <div className={`${item.color} bg-base-100 p-2 rounded-full shadow-md`}>
                      {item.icon}
                    </div>
                    <span className="text-base-content/80 font-medium">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            
            <motion.div 
              className="relative"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="card bg-base-100 shadow-2xl border border-base-300">
                <div className="card-body p-6">
                  <FoodEntryForm />
                </div>
              </div>
              
              {/* Floating elements around the card */}
              <motion.div
                animate={{ 
                  y: [0, -10, 0],
                  rotate: [0, 5, 0]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="absolute -top-4 -left-4 w-8 h-8 bg-primary/20 rounded-full blur-sm"
              />
              <motion.div
                animate={{ 
                  y: [0, 10, 0],
                  rotate: [0, -5, 0]
                }}
                transition={{ 
                  duration: 4, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="absolute -bottom-4 -right-4 w-6 h-6 bg-secondary/20 rounded-full blur-sm"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="py-24 bg-gradient-to-r from-primary to-secondary relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <motion.div
            animate={{ 
              rotate: 360,
              scale: [1, 1.2, 1]
            }}
            transition={{ 
              duration: 15, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full"
          />
          <motion.div
            animate={{ 
              rotate: -360,
              scale: [1.2, 1, 1.2]
            }}
            transition={{ 
              duration: 20, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            className="absolute bottom-10 left-10 w-24 h-24 bg-white/10 rounded-full"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Transform Your Health?
            </h2>
            <p className="text-xl text-white/90 mb-10 max-w-3xl mx-auto leading-relaxed">
              Join thousands of users who are already achieving their health goals with NutriTrackAI
            </p>
            
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className="inline-block"
            >
              <Link href="/auth">
                <button className="btn btn-lg bg-white text-primary hover:bg-gray-100 shadow-2xl hover:shadow-white/50 transition-all duration-300 transform hover:-translate-y-1 border-0">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start Your Journey Today
                </button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
      <MobileNav />
    </div>
  );
};

export default Home;
