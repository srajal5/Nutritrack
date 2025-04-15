import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Chart } from 'chart.js/auto';
import { FoodEntryDocument, NutritionGoalDocument } from '../types';
import { getQueryFn } from '../lib/queryClient';
import { useAuth } from '../hooks/use-auth';

interface WeeklyCaloriesResult {
  results: number[];
  dayNames: string[];
}

const WeeklyCaloriesChart = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  
  // Fetch nutrition goals
  const { data: nutritionGoal } = useQuery<NutritionGoalDocument>({
    queryKey: [`/api/nutrition-goals?userId=${userId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!userId
  });
  
  // Fetch food entries
  const { data: foodEntries = [] } = useQuery<FoodEntryDocument[]>({
    queryKey: [`/api/food-entries?userId=${userId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!userId,
    initialData: []
  });
  
  // Calculate daily calories for the past week
  const calculateWeeklyCalories = (): WeeklyCaloriesResult => {
    if (!foodEntries) return { results: Array(7).fill(0), dayNames: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] };
    
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const results = Array(7).fill(0);
    
    // Get start of the week (Monday)
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust to get Monday
    startOfWeek.setDate(today.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);
    
    foodEntries.forEach((entry) => {
      const entryDate = new Date(entry.timestamp);
      if (entryDate >= startOfWeek) {
        const dayIndex = Math.floor((entryDate.getTime() - startOfWeek.getTime()) / (24 * 60 * 60 * 1000));
        if (dayIndex >= 0 && dayIndex < 7) {
          results[dayIndex] += entry.calories || 0;
        }
      }
    });
    
    return { results, dayNames };
  };
  
  const { results: weeklyCalories, dayNames } = calculateWeeklyCalories();
  const calorieGoal = nutritionGoal?.calorieGoal || 2100;
  
  useEffect(() => {
    if (!chartRef.current) return;
    
    // Destroy previous chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    // Create new chart
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;
    
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dayNames,
        datasets: [
          {
            label: 'Calories Consumed',
            data: weeklyCalories.map((cal: number) => Math.round(cal)),
            backgroundColor: '#4CAF50',
            borderRadius: 6
          },
          {
            label: 'Calorie Goal',
            data: Array(7).fill(calorieGoal),
            type: 'line',
            borderColor: '#FF9800',
            borderWidth: 2,
            pointBackgroundColor: '#FF9800',
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              display: true
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
    
    // Cleanup
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [weeklyCalories, calorieGoal, dayNames]);
  
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="font-heading text-xl font-semibold mb-4">Weekly Calorie Intake</h3>
      <div className="h-72">
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
};

export default WeeklyCaloriesChart;
