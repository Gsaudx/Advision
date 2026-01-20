interface ActivitySkeletonProps {
  count?: number;
}

export function ActivitySkeleton({ count = 5 }: ActivitySkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 animate-pulse"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="w-2 h-2 rounded-full bg-slate-600" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-700 rounded w-3/4" />
              <div className="h-3 bg-slate-700 rounded w-1/2" />
            </div>
          </div>
          <div className="h-3 bg-slate-700 rounded w-16 ml-2" />
        </div>
      ))}
    </div>
  );
}
