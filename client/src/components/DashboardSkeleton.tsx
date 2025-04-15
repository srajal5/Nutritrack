import { motion } from 'framer-motion';
import HealthStatsSkeleton from "./HealthStatsSkeleton";

export default function DashboardSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* First column */}
      <div className="space-y-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10">
          <div className="space-y-4">
            <div className="h-8 w-1/3 bg-white/10 rounded animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-white/10 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10">
          <div className="space-y-4">
            <div className="h-8 w-1/2 bg-white/10 rounded animate-pulse" />
            <div className="space-y-2">
              <div className="h-10 w-full bg-white/10 rounded animate-pulse" />
              <div className="h-10 w-full bg-white/10 rounded animate-pulse" />
              <div className="h-10 w-full bg-white/10 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Second column */}
      <div className="space-y-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10">
          <div className="space-y-4">
            <div className="h-8 w-1/3 bg-white/10 rounded animate-pulse" />
            <div className="h-48 w-full bg-white/10 rounded animate-pulse" />
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10">
          <div className="space-y-4">
            <div className="h-8 w-1/3 bg-white/10 rounded animate-pulse" />
            <div className="h-48 w-full bg-white/10 rounded animate-pulse" />
          </div>
        </div>
      </div>
      
      {/* Third column */}
      <div className="space-y-6 lg:col-span-1">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10">
          <HealthStatsSkeleton />
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10">
          <div className="space-y-4">
            <div className="h-8 w-1/3 bg-white/10 rounded animate-pulse" />
            <div className="h-48 w-full bg-white/10 rounded animate-pulse" />
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10">
          <div className="space-y-4">
            <div className="h-8 w-1/3 bg-white/10 rounded animate-pulse" />
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 w-full bg-white/10 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Full width sections */}
      <div className="md:col-span-2 lg:col-span-3 space-y-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10">
          <div className="space-y-4">
            <div className="h-8 w-1/3 bg-white/10 rounded animate-pulse" />
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 w-full bg-white/10 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10">
          <div className="space-y-4">
            <div className="h-8 w-1/3 bg-white/10 rounded animate-pulse" />
            <div className="h-64 w-full bg-white/10 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
} 