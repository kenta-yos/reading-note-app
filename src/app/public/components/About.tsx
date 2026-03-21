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
    link: "https://my-reading-assistant.vercel.app/",
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
    <div>
      {/* Self-intro text */}
      <div className="text-center text-base lg:text-lg text-slate-700 leading-[1.9] space-y-4 mb-12">
        <p>文系大学院卒のサラリーマンです。</p>
        <p>
          社会人になってから「学術書」の読書をスタートさせ、
          <br className="hidden sm:inline" />
          日々の生活のなかで感じた疑問やもやもやを考えるためのヒントをたくさんもらってきました。
        </p>
        <p>
          これまで読んできた本の記録と、関心がどう広がってきたかをこのページにまとめています。
        </p>
      </div>

      {/* Activities label */}
      <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] text-center mb-5">
        やっていること
      </p>

      {/* Activity cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {activities.map((a) => {
          const Wrapper = a.link ? "a" : "div";
          const wrapperProps = a.link
            ? { href: a.link, target: "_blank" as const, rel: "noopener noreferrer" }
            : {};
          return (
            <Wrapper
              key={a.label}
              {...wrapperProps}
              className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm block${
                a.link ? " hover:border-slate-300 hover:shadow-md transition-shadow" : ""
              }`}
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
              {a.link && (
                <p className="text-xs text-[#1a5276] font-medium mt-2 flex items-center gap-1">
                  アプリを見る
                  <span aria-hidden="true" className="text-[10px]">↗</span>
                </p>
              )}
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
