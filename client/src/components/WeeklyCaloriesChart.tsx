import { useDashboardData } from "../hooks/use-dashboard-data";
import { useTheme } from "@/components/ThemeProvider";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function WeeklyCaloriesChart() {
  const { weeklyProgress, nutritionGoals, isLoading, hasPlan } = useDashboardData();
  const { resolvedTheme } = useTheme();

  const textColor = resolvedTheme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
  const gridColor = resolvedTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const goalColor = resolvedTheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)';

  if (isLoading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading weekly calories">
        <div className="h-4 w-1/3 bg-card rounded animate-pulse" />
        <div className="h-48 w-full bg-card rounded animate-pulse" />
      </div>
    );
  }

  // A missing plan is not the same as a week of zeroes. Without a target there
  // is no goal line to draw, so say so rather than plotting a flat line at 0.
  if (!hasPlan) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center px-4">
        <p className="text-sm text-muted-foreground">
          Complete your personalized plan to see your weekly calories against a target.
        </p>
      </div>
    );
  }

  if (!weeklyProgress || weeklyProgress.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center px-4">
        <p className="text-sm text-muted-foreground">No meals logged in the last 7 days.</p>
      </div>
    );
  }

  const data = {
    labels: weeklyProgress.map((entry) => {
      const d = new Date(entry.date);
      return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { weekday: 'short' });
    }),
    datasets: [
      {
        label: 'Calories',
        data: weeklyProgress.map(entry => entry.calories),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.5)',
        tension: 0.4
      },
      {
        label: 'Goal',
        data: weeklyProgress.map(() => nutritionGoals.dailyCalories),
        borderColor: goalColor,
        borderDash: [5, 5],
        fill: false
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: textColor
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: gridColor
        },
        ticks: {
          color: textColor
        }
      },
      x: {
        grid: {
          color: gridColor
        },
        ticks: {
          color: textColor
        }
      }
    }
  };

  return (
    <div className="h-64">
      <Line data={data} options={options} />
    </div>
  );
}
