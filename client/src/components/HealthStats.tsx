import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface HealthMetric {
  label: string;
  value: number;
  unit: string;
  icon: string;
  color: string;
}

export default function HealthStats() {
  const [metrics] = useState<HealthMetric[]>([
    {
      label: 'Daily Calories',
      value: 1850,
      unit: 'kcal',
      icon: '🔥',
      color: 'text-orange-500',
    },
    {
      label: 'Water Intake',
      value: 2.5,
      unit: 'L',
      icon: '💧',
      color: 'text-blue-500',
    },
    {
      label: 'Protein',
      value: 75,
      unit: 'g',
      icon: '🥩',
      color: 'text-red-500',
    },
    {
      label: 'Steps',
      value: 8500,
      unit: 'steps',
      icon: '👣',
      color: 'text-green-500',
    },
  ]);

  const [activeMetric, setActiveMetric] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveMetric((prev) => (prev + 1) % metrics.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [metrics.length]);

  return (
    <div className="fixed right-8 top-1/2 transform -translate-y-1/2 flex flex-col gap-4 z-10">
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.label}
          className={`relative bg-white/10 backdrop-blur-sm p-4 rounded-lg text-white w-48 ${
            index === activeMetric ? 'scale-110' : 'scale-100'
          } transition-all duration-300`}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">{metric.icon}</span>
            <span className={`text-sm ${metric.color}`}>{metric.label}</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            {metric.value}
            <span className="text-sm ml-1 opacity-75">{metric.unit}</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${metric.color.replace('text-', 'bg-')}`}
              initial={{ width: 0 }}
              animate={{ width: `${(metric.value / 2000) * 100}%` }}
              transition={{ duration: 1, delay: index * 0.1 }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
} 