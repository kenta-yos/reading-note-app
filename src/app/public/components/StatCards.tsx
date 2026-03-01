"use client";

import { useEffect, useRef, useState } from "react";

type StatCardsProps = {
  totalBooks: number;
  minYear: number;
  maxYear: number;
  totalPages: number;
};

function useCountUp(target: number, duration = 1500) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const start = performance.now();
        const step = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          // ease-out quad
          const eased = 1 - (1 - t) * (1 - t);
          setValue(Math.round(eased * target));
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { value, ref };
}

export default function StatCards({
  totalBooks,
  minYear,
  maxYear,
  totalPages,
}: StatCardsProps) {
  const books = useCountUp(totalBooks);
  const pages = useCountUp(totalPages, 2000);

  return (
    <div
      ref={books.ref}
      className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto"
    >
      <div className="bg-white rounded-xl border border-slate-200 p-5 text-center shadow-sm">
        <p className="text-sm text-slate-500 mb-1">読了冊数</p>
        <p className="text-3xl lg:text-4xl font-bold text-slate-800 tabular-nums">
          {books.value.toLocaleString()}
          <span className="text-base font-normal text-slate-400 ml-1">冊</span>
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 text-center shadow-sm">
        <p className="text-sm text-slate-500 mb-1">読書期間</p>
        <p className="text-3xl lg:text-4xl font-bold text-slate-800 tabular-nums">
          {minYear}
          <span className="text-base font-normal text-slate-400 mx-1">〜</span>
          {maxYear}
          <span className="text-base font-normal text-slate-400 ml-1">年</span>
        </p>
      </div>

      <div
        ref={pages.ref}
        className="bg-white rounded-xl border border-slate-200 p-5 text-center shadow-sm"
      >
        <p className="text-sm text-slate-500 mb-1">総ページ数</p>
        <p className="text-3xl lg:text-4xl font-bold text-slate-800 tabular-nums">
          約{pages.value.toLocaleString()}
          <span className="text-base font-normal text-slate-400 ml-1">
            ページ
          </span>
        </p>
      </div>
    </div>
  );
}
