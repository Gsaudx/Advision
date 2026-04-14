interface ActivitySkeletonProps {
  count?: number;
}

export function ActivitySkeleton({ count = 5 }: ActivitySkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-3 rounded-lg bg-adv-s1 animate-pulse"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="w-2 h-2 rounded-full bg-adv-s3" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-adv-s2 rounded w-3/4" />
              <div className="h-3 bg-adv-s2 rounded w-1/2" />
            </div>
          </div>
          <div className="h-3 bg-adv-s2 rounded w-16 ml-2" />
        </div>
      ))}
    </div>
  );
}
