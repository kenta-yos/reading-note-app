import Skeleton from "./Skeleton";

export default function BookCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-2">
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-3 w-10 rounded" />
      </div>
      <Skeleton className="h-3 w-1/3 rounded mb-1" />
      <Skeleton className="h-3 w-1/2 rounded mb-2" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-3 w-10 rounded" />
      </div>
      <Skeleton className="h-4 w-20 rounded-full mt-2" />
    </div>
  );
}

export function BookListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <BookCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
