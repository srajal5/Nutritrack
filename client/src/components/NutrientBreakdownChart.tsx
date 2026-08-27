import { useEffect, useRef } from 'react';
import { Chart, PolarAreaController, RadialLinearScale, ArcElement, Tooltip } from 'chart.js';
import { Progress } from '@/components/ui/progress';
import { useTheme } from '@/components/ThemeProvider';
import { usePlan } from '@/hooks/use-plan';

Chart.register(PolarAreaController, RadialLinearScale, ArcElement, Tooltip);

const NutrientBreakdownChart = () => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const { resolvedTheme } = useTheme();

  // Reads the canonical dashboard totals. This component used to query
  // /api/food-entries/daily and treat the response as an array, but that
  // endpoint returns a summary OBJECT — so `.length` was always undefined and
  // the chart silently rendered 0/0/0 for every user, forever.
  const { today } = usePlan();

  const calculateMacros = () => {
    const protein = Math.round(today?.protein ?? 0);
    const carbs = Math.round(today?.carbs ?? 0);
    const fat = Math.round(today?.fat ?? 0);

    // Percentages are of energy actually consumed, not of the target.
    const totalCals = protein * 4 + carbs * 4 + fat * 9;

    return {
      protein, carbs, fat,
      proteinPct: totalCals > 0 ? Math.round((protein * 4 / totalCals) * 100) : 0,
      carbsPct: totalCals > 0 ? Math.round((carbs * 4 / totalCals) * 100) : 0,
      fatPct: totalCals > 0 ? Math.round((fat * 9 / totalCals) * 100) : 0,
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
