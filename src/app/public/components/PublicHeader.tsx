"use client";

import { useEffect, useState } from "react";

const JOURNEY_TEXT =
  "教育社会学→家族社会学→フェミニズム→クィア→障害→人種・エスニシティ→質的社会調査→政治哲学・法哲学→日本政治・国際政治";

export default function PublicHeader() {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const chars = [...JOURNEY_TEXT];
    const timer = setInterval(() => {
      i++;
      setDisplayed(chars.slice(0, i).join(""));
      if (i >= chars.length) {
        clearInterval(timer);
        setDone(true);
      }
    }, 30);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="text-center py-12 lg:py-20 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Avatar placeholder */}
        <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 mx-auto mb-5 flex items-center justify-center text-white text-2xl lg:text-3xl font-bold shadow-lg">
          K
        </div>

        <h1 className="text-2xl lg:text-4xl font-bold text-slate-800 mb-2">
          Ken | 本好き
        </h1>
        <p className="text-base lg:text-lg text-slate-500 mb-4">
          芋づる式読書の記録
        </p>

        {/* Reading journey with typewriter effect */}
        <p className="text-xs lg:text-sm text-slate-400 leading-relaxed min-h-[2.5em] mb-8">
          {displayed}
          {!done && (
            <span className="inline-block w-0.5 h-4 bg-slate-400 ml-0.5 animate-pulse align-text-bottom" />
          )}
        </p>

        {/* CTA Links */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="https://my-reading-assistant.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-medium transition-all hover:scale-105 shadow-md"
            style={{ backgroundColor: "#1a5276" }}
          >
            Lukaで読書準備する →
          </a>
          <a
            href="https://note.com/ken_book_lover"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-medium transition-all hover:border-slate-300 hover:bg-slate-50"
          >
            note で記事を読む
          </a>
        </div>

        {/* SNS links */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <a
            href="https://bsky.app/profile/yomuhito21.bsky.social"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-400 hover:text-blue-500 transition-colors"
          >
            Bluesky
          </a>
        </div>
      </div>
    </header>
  );
}
