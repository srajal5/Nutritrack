import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Chart, DoughnutController, ArcElement, Legend, Tooltip } from 'chart.js';
import { FoodEntryDocument } from '../types';
import { useAuth } from '@/hooks/use-auth';

Chart.register(DoughnutController, ArcElement, Legend, Tooltip);

interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const NutritionChart = () => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const { user } = useAuth();
  
  // Fetch food entries with proper typing
  const { data: todayEntries = [], isLoading } = useQuery<FoodEntryDocument[]>({
    queryKey: [`/api/food-entries/daily?userId=${user?.id}`],
    initialData: [],
    enabled: !!user?.id
  });
  
  // Calculate macronutrient totals and percentages
  const calculateMacros = () => {
    if (!todayEntries || !todayEntries.length) {
      return { protein: 0, carbs: 0, fat: 0, proteinPct: 0, carbsPct: 0, fatPct: 0 };
    }
    
    const totals = todayEntries.reduce((acc: NutritionTotals, entry: FoodEntryDocument) => {
      return {
        calories: acc.calories + (entry.calories || 0),
        protein: acc.protein + (entry.protein || 0),
        carbs: acc.carbs + (entry.carbs || 0),
        fat: acc.fat + (entry.fat || 0)
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    
    const totalCals = totals.protein * 4 + totals.carbs * 4 + totals.fat * 9;
    
    return {
      ...totals,
      proteinPct: totalCals > 0 ? Math.round((totals.protein * 4 / totalCals) * 100) : 0,
      carbsPct: totalCals > 0 ? Math.round((totals.carbs * 4 / totalCals) * 100) : 0,
      fatPct: totalCals > 0 ? Math.round((totals.fat * 9 / totalCals) * 100) : 0,
    };
  };
  
  const { protein, carbs, fat } = calculateMacros();
  
  // Calculate percentages
  const totalGrams = protein + carbs + fat;
  const proteinPercentage = totalGrams > 0 ? Math.round((protein / totalGrams) * 100) : 0;
  const carbsPercentage = totalGrams > 0 ? Math.round((carbs / totalGrams) * 100) : 0;
  const fatPercentage = totalGrams > 0 ? Math.round((fat / totalGrams) * 100) : 0;
  
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
      type: 'doughnut',
      data: {
        labels: ['Protein', 'Carbs', 'Fat'],
        datasets: [{
          data: [proteinPercentage, carbsPercentage, fatPercentage],
          backgroundColor: ['#4CAF50', '#2196F3', '#FF9800'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              padding: 15,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                return `${label}: ${value}%`;
              }
            }
          }
        }
      }
    });
    
    // Cleanup on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [protein, carbs, fat]);
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded mb-4"></div>
        <div className="h-52 bg-slate-200 rounded"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="font-heading text-xl font-semibold mb-4">Macronutrient Balance</h3>
      <div className="h-52">
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
};

export default NutritionChart;
