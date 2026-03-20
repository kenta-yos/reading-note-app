const activities = [
  {
    emoji: "📚",
    label: "本の販売",
    description: "神保町のシェア本屋さんで本を売っています",
    note: "4/1〜",
  },
  {
    emoji: "💬",
    label: "読書会",
    description: "読書会を企画しています",
    note: null,
  },
  {
    emoji: "🛠",
    label: "アプリ開発",
    description: "読書体験をサポートするアプリを開発しています",
    note: null,
  },
  {
    emoji: "🔍",
    label: "選書相談",
    description:
      "どんな本を読めばいいかわからない方のお話を伺い、最適な本をお選びします",
    note: "準備中",
  },
];

export default function About() {
  return (
    <section className="max-w-2xl mx-auto px-4 py-14 lg:py-16">
      {/* Who I am */}
      <p className="text-base lg:text-lg text-slate-700 leading-relaxed">
        文系大学院を出て、いまは会社員をしています。
        新卒の就職活動に強い違和感を覚えたことをきっかけに本を読み始め、
        そこから「社会はなぜこうなっているのか」を知るための読書を続けてきました。
      </p>
      <p className="text-base lg:text-lg text-slate-700 leading-relaxed mt-4 mb-12">
        これまで読んできた本の記録と、関心がどう広がってきたかをこのページにまとめています。
      </p>

      {/* What I do */}
      <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">
        やっていること
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {activities.map((a) => (
          <div
            key={a.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg leading-none">{a.emoji}</span>
              <span className="text-sm font-bold text-slate-800">
                {a.label}
              </span>
              {a.note && (
                <span className="ml-auto text-[11px] font-medium text-[#1a5276] bg-[#1a527610] px-2 py-0.5 rounded-full">
                  {a.note}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {a.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
