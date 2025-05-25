import { motion } from 'framer-motion';
import HealthStatsSkeleton from "./HealthStatsSkeleton";

export default function DashboardSkeleton() {
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
    <motion.div 
      className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* First column */}
      <motion.div className="space-y-6" variants={itemVariants}>
        <motion.div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10" variants={itemVariants}>
          <div className="space-y-4">
            <div className="h-8 w-1/3 bg-white/10 rounded animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-white/10 rounded animate-pulse" />
            </div>
          </div>
        </motion.div>
        <motion.div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10" variants={itemVariants}>
          <div className="space-y-4">
            <div className="h-8 w-1/2 bg-white/10 rounded animate-pulse" />
            <div className="space-y-2">
              <div className="h-10 w-full bg-white/10 rounded animate-pulse" />
              <div className="h-10 w-full bg-white/10 rounded animate-pulse" />
              <div className="h-10 w-full bg-white/10 rounded animate-pulse" />
            </div>
          </div>
        </motion.div>
      </motion.div>
      
      {/* Second column */}
      <motion.div className="space-y-6" variants={itemVariants}>
        <motion.div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10" variants={itemVariants}>
          <div className="space-y-4">
            <div className="h-8 w-1/3 bg-white/10 rounded animate-pulse" />
            <div className="h-48 w-full bg-white/10 rounded animate-pulse" />
          </div>
        </motion.div>
        <motion.div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10" variants={itemVariants}>
          <div className="space-y-4">
            <div className="h-8 w-1/3 bg-white/10 rounded animate-pulse" />
            <div className="h-48 w-full bg-white/10 rounded animate-pulse" />
          </div>
        </motion.div>
      </motion.div>
      
      {/* Third column */}
      <motion.div className="space-y-6 lg:col-span-1" variants={itemVariants}>
        <motion.div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10" variants={itemVariants}>
          <HealthStatsSkeleton />
        </motion.div>
        <motion.div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10" variants={itemVariants}>
          <div className="space-y-4">
            <div className="h-8 w-1/3 bg-white/10 rounded animate-pulse" />
            <div className="h-48 w-full bg-white/10 rounded animate-pulse" />
          </div>
        </motion.div>
        <motion.div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10" variants={itemVariants}>
          <div className="space-y-4">
            <div className="h-8 w-1/3 bg-white/10 rounded animate-pulse" />
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <motion.div 
                  key={i} 
                  className="h-16 w-full bg-white/10 rounded animate-pulse" 
                  variants={itemVariants}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
      
      {/* Full width sections */}
      <motion.div className="md:col-span-2 lg:col-span-3 space-y-6" variants={itemVariants}>
        <motion.div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10" variants={itemVariants}>
          <div className="space-y-4">
            <div className="h-8 w-1/3 bg-white/10 rounded animate-pulse" />
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <motion.div 
                  key={i} 
                  className="h-24 w-full bg-white/10 rounded animate-pulse" 
                  variants={itemVariants}
                />
              ))}
            </div>
          </div>
        </motion.div>
        <motion.div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10" variants={itemVariants}>
          <div className="space-y-4">
            <div className="h-8 w-1/3 bg-white/10 rounded animate-pulse" />
            <div className="h-64 w-full bg-white/10 rounded animate-pulse" />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
} 