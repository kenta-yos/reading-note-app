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
      className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-slate-500 text-sm"
    >
      <span>
        {minYear} 〜 {maxYear}年
      </span>
      <span className="text-slate-300 hidden sm:inline">|</span>
      <span ref={pages.ref}>
        <span className="font-semibold text-slate-700 tabular-nums">
          {books.value.toLocaleString()}
        </span>{" "}
        冊
      </span>
      <span className="text-slate-300 hidden sm:inline">|</span>
      <span>
        約{" "}
        <span className="font-semibold text-slate-700 tabular-nums">
          {pages.value.toLocaleString()}
        </span>{" "}
        ページ
      </span>
    </div>
  );
}
