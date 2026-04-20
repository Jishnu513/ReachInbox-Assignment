interface LoadingSkeletonProps {
  rows?: number;
}

export default function LoadingSkeleton({ rows = 5 }: LoadingSkeletonProps) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-gray-100 rounded-full w-1/3" />
            <div className="h-3 bg-gray-100 rounded-full w-1/2" />
          </div>
          <div className="hidden md:block h-3 bg-gray-100 rounded-full w-24" />
          <div className="h-5 bg-gray-100 rounded-full w-16" />
        </div>
      ))}
    </div>
  );
}
