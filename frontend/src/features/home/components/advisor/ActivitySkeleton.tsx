interface ActivitySkeletonProps {
  count?: number;
}

export function ActivitySkeleton({ count = 5 }: ActivitySkeletonProps) {
  return (
    <div className="divide-y divide-outline-variant/10">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-6 p-6 animate-pulse">
          <div className="w-12 h-12 rounded-full bg-surface-container-high flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-surface-container-high rounded-full w-3/4" />
            <div className="h-3 bg-surface-container-high rounded-full w-1/2" />
          </div>
          <div className="h-3 bg-surface-container-high rounded-full w-16 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}
