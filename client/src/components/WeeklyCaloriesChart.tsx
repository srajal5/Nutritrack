import { useDashboardData } from "../hooks/use-dashboard-data";
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
  const { weeklyProgress, nutritionGoals, isLoading } = useDashboardData();

  if (isLoading || !weeklyProgress || !nutritionGoals) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-1/3 bg-white/10 rounded animate-pulse" />
        <div className="h-48 w-full bg-white/10 rounded animate-pulse" />
      </div>
    );
  }

  const data = {
    labels: weeklyProgress.map(entry => new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short' })),
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
        data: Array(7).fill(nutritionGoals.dailyCalories),
        borderColor: 'rgba(255, 255, 255, 0.2)',
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
          color: 'rgba(255, 255, 255, 0.7)'
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)'
        }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)'
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
