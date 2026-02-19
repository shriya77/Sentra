export function DashboardSkeleton() {
  return (
    <div className="max-w-[640px] mx-auto animate-pulse">
      <div className="h-6 w-16 bg-white/50 rounded mb-4" />
      <div className="h-44 rounded-3xl glass p-6 mb-8">
        <div className="h-5 w-32 bg-white/60 rounded mb-4" />
        <div className="h-14 w-24 bg-white/50 rounded-2xl mb-3" />
        <div className="h-4 w-48 bg-white/40 rounded" />
      </div>
      <div className="h-4 w-56 bg-white/40 rounded mb-4" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 rounded-2xl glass px-5 flex items-center justify-between">
            <div className="h-4 w-32 bg-white/50 rounded" />
            <div className="h-4 w-4 bg-white/40 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-3xl glass p-6 animate-pulse ${className}`}>
      <div className="h-5 w-28 bg-white/50 rounded mb-4" />
      <div className="h-4 w-full bg-white/40 rounded mb-2" />
      <div className="h-4 w-[85%] bg-white/40 rounded" />
    </div>
  );
}
