import { useDashboardData } from "../hooks/use-dashboard-data";
import { formatDistanceToNow } from "date-fns";

export default function RecentFoodEntries() {
  const { recentEntries, isLoading } = useDashboardData();

  if (isLoading || !recentEntries) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-1/3 bg-white/10 rounded animate-pulse" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 w-full bg-white/10 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recentEntries.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <div className="space-y-1">
            <h4 className="text-white font-medium">{entry.name}</h4>
            <p className="text-sm text-white/50">
              {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-white font-medium">{entry.calories} kcal</p>
          </div>
        </div>
      ))}
    </div>
  );
}
