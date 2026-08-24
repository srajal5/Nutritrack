

export default function HealthStatsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-1/2 bg-card rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-card rounded animate-pulse" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-16 bg-card rounded animate-pulse" />
            <div className="h-8 w-24 bg-card rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Progress Bars */}
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <div className="h-4 w-20 bg-card rounded animate-pulse" />
              <div className="h-4 w-12 bg-card rounded animate-pulse" />
            </div>
            <div className="h-2 w-full bg-card rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Recommendations */}
      <div className="space-y-4">
        <div className="h-6 w-1/3 bg-card rounded animate-pulse" />
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-16 w-full bg-card rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
} 