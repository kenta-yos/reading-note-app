export default function About() {
  return (
    <section className="max-w-2xl mx-auto px-4 py-14 lg:py-16">
      {/* Who I am */}
      <div className="mb-10">
        <p className="text-base lg:text-lg text-slate-700 leading-relaxed">
          文系大学院を出て、いまは会社員をしています。
          <br className="hidden lg:inline" />
          新卒の就職活動に強い違和感を覚えたことをきっかけに本を読み始め、
          そこから「社会はなぜこうなっているのか」を知るための読書を続けてきました。
        </p>
        <p className="text-base lg:text-lg text-slate-700 leading-relaxed mt-4">
          これまで読んできた本の記録と、関心がどう広がってきたかをこのページにまとめています。
        </p>
      </div>

      {/* What I do */}
      <div>
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-5">
          やっていること
        </h2>
        <ul className="space-y-4">
          <li className="flex items-start gap-3">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#1a5276] shrink-0" />
            <p className="text-base text-slate-700">
              神保町の本屋で本を売っています
              {/* TODO: パサージュ棚主のリンクを追加 */}
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#1a5276] shrink-0" />
            <p className="text-base text-slate-700">
              読書会を企画しています
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#1a5276] shrink-0" />
            <p className="text-base text-slate-700">
              読書体験をサポートするアプリを開発しています
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#1a5276] shrink-0" />
            <p className="text-base text-slate-700">
              どんな本を読めばいいかわからない方の選書相談にのります
            </p>
          </li>
        </ul>
      </div>
    </section>
  );
}
