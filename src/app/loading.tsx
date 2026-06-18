export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col p-4 md:p-8 font-sans">
      {/* Header skeleton */}
      <header className="mb-6 border-b border-slate-800 pb-4">
        <div className="h-7 w-80 bg-slate-800 rounded animate-pulse" />
        <div className="h-4 w-64 bg-slate-800/60 rounded animate-pulse mt-2" />
      </header>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Left panel skeleton */}
        <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-800 space-y-4">
          <div className="h-5 w-48 bg-slate-700 rounded animate-pulse" />
          <div className="h-10 w-full bg-slate-900 rounded-lg animate-pulse" />
          <div className="h-28 w-full bg-slate-900 rounded-lg animate-pulse" />
          <div className="h-11 w-full bg-indigo-800/50 rounded-lg animate-pulse" />
        </div>

        {/* Right panel skeleton */}
        <div className="lg:col-span-2 bg-slate-800/30 rounded-xl border border-slate-800 flex flex-col h-[70vh] lg:h-auto overflow-hidden">
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-3">
              <div className="h-10 w-10 bg-slate-800 rounded-full animate-pulse" />
              <div className="h-4 w-48 bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-64 bg-slate-800/60 rounded animate-pulse" />
            </div>
          </div>
          <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex gap-3">
            <div className="flex-1 h-11 bg-slate-800 rounded-lg animate-pulse" />
            <div className="h-11 w-16 bg-slate-700 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    </main>
  );
}
