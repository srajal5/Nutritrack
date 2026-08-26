import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Chart, PolarAreaController, RadialLinearScale, ArcElement, Tooltip } from 'chart.js';
import { Progress } from '@/components/ui/progress';
import { FoodEntryDocument } from '../types';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/use-auth';

Chart.register(PolarAreaController, RadialLinearScale, ArcElement, Tooltip);

const NutrientBreakdownChart = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const { resolvedTheme } = useTheme();
  
  // Fetch food entries
  const { data: todayEntries = [] } = useQuery<FoodEntryDocument[]>({
    queryKey: [`/api/food-entries/daily?userId=${userId}`],
    initialData: []
  });
  
  // Calculate macronutrient totals and percentages
  const calculateMacros = () => {
    if (!todayEntries || !todayEntries.length) {
      return { protein: 0, carbs: 0, fat: 0, proteinPct: 0, carbsPct: 0, fatPct: 0 };
    }
    
    const totals = todayEntries.reduce((acc, entry) => {
      return {
        protein: acc.protein + (entry.protein || 0),
        carbs: acc.carbs + (entry.carbs || 0),
        fat: acc.fat + (entry.fat || 0),
      };
    }, { protein: 0, carbs: 0, fat: 0 });
    
    const totalCals = totals.protein * 4 + totals.carbs * 4 + totals.fat * 9;
    
    return {
      ...totals,
      proteinPct: totalCals > 0 ? Math.round((totals.protein * 4 / totalCals) * 100) : 0,
      carbsPct: totalCals > 0 ? Math.round((totals.carbs * 4 / totalCals) * 100) : 0,
      fatPct: totalCals > 0 ? Math.round((totals.fat * 9 / totalCals) * 100) : 0,
    };
  };
  
  const { protein, carbs, fat, proteinPct, carbsPct, fatPct } = calculateMacros();
  
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
      type: 'polarArea',
      data: {
        labels: ['Protein', 'Carbs', 'Fat'],
        datasets: [{
          data: [proteinPct, carbsPct, fatPct],
          backgroundColor: ['#4CAF50', '#2196F3', '#FF9800'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: resolvedTheme === 'dark' ? '#1e293b' : '#ffffff',
            titleColor: resolvedTheme === 'dark' ? '#f8fafc' : '#0f172a',
            bodyColor: resolvedTheme === 'dark' ? '#f8fafc' : '#0f172a',
            borderColor: resolvedTheme === 'dark' ? '#334155' : '#e2e8f0',
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                return `${label}: ${value}% of calories`;
              }
            }
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
  }, [proteinPct, carbsPct, fatPct, resolvedTheme]);
  
  return (
    <div className="bg-card text-card-foreground rounded-xl shadow-md p-6">
      <h3 className="font-heading text-xl font-semibold mb-4">Nutrient Breakdown</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-40">
          <canvas ref={chartRef}></canvas>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium">Protein</span>
              <span className="text-sm font-mono">{protein}g ({proteinPct}%)</span>
            </div>
            <Progress value={proteinPct} className="h-2 bg-secondary" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium">Carbs</span>
              <span className="text-sm font-mono">{carbs}g ({carbsPct}%)</span>
            </div>
            <Progress value={carbsPct} className="h-2 bg-secondary" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium">Fat</span>
              <span className="text-sm font-mono">{fat}g ({fatPct}%)</span>
            </div>
            <Progress value={fatPct} className="h-2 bg-secondary" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NutrientBreakdownChart;
