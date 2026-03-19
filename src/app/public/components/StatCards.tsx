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
  const started = useRef(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        observer.disconnect();

        const start = performance.now();
        const step = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
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
      className="grid grid-cols-3 gap-4 max-w-lg mx-auto"
    >
      <div className="text-center">
        <p className="text-2xl lg:text-3xl font-bold text-slate-800 tabular-nums">
          {minYear}–{maxYear}
        </p>
        <p className="text-xs text-slate-500 mt-1">年</p>
      </div>
      <div className="text-center border-x border-slate-200" ref={pages.ref}>
        <p className="text-2xl lg:text-3xl font-bold text-slate-800 tabular-nums">
          {books.value.toLocaleString()}
        </p>
        <p className="text-xs text-slate-500 mt-1">冊</p>
      </div>
      <div className="text-center">
        <p className="text-2xl lg:text-3xl font-bold text-slate-800 tabular-nums">
          {pages.value.toLocaleString()}
        </p>
        <p className="text-xs text-slate-500 mt-1">ページ</p>
      </div>
    </div>
  );
}
