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

export default function Activities() {
  return (
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
  );
}
