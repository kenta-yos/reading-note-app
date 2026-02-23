export default function DiscoverLoading() {
  return (
    <div className="max-w-2xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="h-7 w-32 bg-slate-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
        </div>
        <div className="h-7 w-24 bg-slate-100 rounded-lg animate-pulse" />
      </div>

      {/* セクションスケルトン x4 */}
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-10 bg-slate-100 rounded-full animate-pulse" />
          </div>
          <div className="h-3 w-56 bg-slate-100 rounded animate-pulse mb-4" />
          {[...Array(3)].map((_, j) => (
            <div key={j} className="py-3 border-b border-slate-100 last:border-0">
              <div className="h-4 w-4/5 bg-slate-100 rounded animate-pulse mb-1.5" />
              <div className="flex gap-3">
                <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
                <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
                <div className="h-3 w-14 bg-slate-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ))}

      <p className="text-center text-xs text-slate-400 mt-2">
        出版社ごとにNDL（国立国会図書館）に問い合わせています…
      </p>
    </div>
  );
}
