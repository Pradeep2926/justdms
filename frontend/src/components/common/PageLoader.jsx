export function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

export function DashboardLoader() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading dashboard">
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="hidden h-11 w-40 sm:block" />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="rounded-lg border border-slate-200 bg-white p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-4 h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="mt-2 h-3 w-64 max-w-full" />
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-24" />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading your Instagram dashboard</span>
    </div>
  );
}

export function AutomationLoader() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading automations">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-56 max-w-[60vw]" />
          </div>
        </div>
        <Skeleton className="h-11 w-40" />
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_180px]">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="flex items-center gap-4 border-b border-slate-100 p-5 last:border-0">
            <Skeleton className="h-14 w-14 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40 max-w-full" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="hidden h-8 w-20 sm:block" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading your automations</span>
    </div>
  );
}
