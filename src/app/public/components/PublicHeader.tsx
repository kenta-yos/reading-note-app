"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

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
        {/* Avatar */}
        <Image
          src="/kendog.png"
          alt="Ken"
          width={96}
          height={96}
          className="w-20 h-20 lg:w-24 lg:h-24 rounded-full mx-auto mb-5 shadow-lg object-cover"
          priority
        />

        <h1 className="text-2xl lg:text-4xl font-bold text-slate-800 mb-2">
          Ken | 本好き
        </h1>
        <p className="text-base lg:text-lg text-slate-500 mb-4">
          芋づる式読書の記録
        </p>

        {/* Reading journey with typewriter effect */}
        <p className="text-xs lg:text-sm text-slate-400 leading-relaxed min-h-[2.5em] mb-8">
          <span className="text-slate-500 font-medium">読書遍歴：</span>
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
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-medium transition-all hover:opacity-85 shadow-md"
            style={{ backgroundColor: "#1a5276" }}
          >
            Lukaで読書準備する
          </a>
          <a
            href="https://note.com/ken_book_lover"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-medium transition-all hover:opacity-85"
          >
            note で記事を読む
          </a>
        </div>

        {/* Bluesky icon link */}
        <div className="flex items-center justify-center mt-5">
          <a
            href="https://bsky.app/profile/yomuhito21.bsky.social"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-blue-500 transition-colors"
            aria-label="Bluesky"
          >
            <svg width="22" height="22" viewBox="0 0 600 530" fill="currentColor">
              <path d="M135.72 44.03C202.216 93.951 273.74 195.401 300 249.49c26.262-54.089 97.782-155.539 164.28-205.46C512.26 8.009 590-19.862 590 68.825c0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.6-175.895-31.511-189.726-71.81-2.527-7.367-3.696-10.821-3.61-7.891-.086-2.93 1.083.524-3.61 7.891-13.83 40.299-67.336 197.41-189.725 71.81-64.444-66.128-34.605-132.256 82.697-152.22-67.106 11.421-142.547-7.449-163.25-81.433C20.155 217.615 10 86.536 10 68.825c0-88.687 77.742-60.816 125.72-24.795z" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
