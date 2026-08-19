/**
 * Skeleton loaders for better UX during loading states
 */

export default function SkeletonLoader({ count = 1, type = 'message' }) {
  const skeletons = Array.from({ length: count }, (_, i) => i)

  if (type === 'message') {
    return (
      <div className="space-y-3">
        {skeletons.map((i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-none p-4 max-w-xs">
              <div className="space-y-2">
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-4/5"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (type === 'table') {
    return (
      <div className="space-y-2">
        {skeletons.map((i) => (
          <div key={i} className="animate-pulse flex gap-2">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded flex-1"></div>
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded flex-1"></div>
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded flex-1"></div>
          </div>
        ))}
      </div>
    )
  }

  if (type === 'stats') {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-3"></div>
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return null
}
