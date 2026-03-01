"use client";

type Discovery = {
  title: string;
  books: string[];
  insight: string;
};

type Evolution = {
  period: string;
  theme: string;
  description: string;
  keyBooks: string[];
};

type Props = {
  analysis: {
    discoveries: Discovery[];
    evolution: Evolution[];
  };
  bookCount: number;
  createdAt: string;
};

export default function InsightCard({ analysis, bookCount, createdAt }: Props) {
  const date = new Date(createdAt);
  const dateStr = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-400">
        {dateStr} 時点 / {bookCount}冊を分析
      </p>

      {/* 発見 */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">
          発見・つながり
        </h3>
        <div className="space-y-4">
          {analysis.discoveries.map((d, i) => (
            <div
              key={i}
              className="bg-amber-50 border border-amber-100 rounded-lg p-4"
            >
              <p className="text-sm font-semibold text-amber-900 mb-1">
                {d.title}
              </p>
              <p className="text-sm text-slate-700 leading-relaxed mb-2">
                {d.insight}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {d.books.map((book) => (
                  <span
                    key={book}
                    className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full"
                  >
                    {book}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 変遷 */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">
          読書の変遷
        </h3>
        <div className="relative pl-6 space-y-4">
          {/* タイムラインの縦線 */}
          <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-blue-200" />
          {analysis.evolution.map((e, i) => (
            <div key={i} className="relative">
              {/* タイムラインのドット */}
              <div className="absolute -left-4 top-1.5 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white" />
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                    {e.period}
                  </span>
                  <span className="text-sm font-semibold text-blue-900">
                    {e.theme}
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed mb-2">
                  {e.description}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {e.keyBooks.map((book) => (
                    <span
                      key={book}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full"
                    >
                      {book}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
