"use client";

import { useEffect, useRef, useState } from "react";

type StatCardsProps = {
  totalBooks: number;
  totalPages: number;
  minYear: number;
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
  totalPages,
  minYear,
}: StatCardsProps) {
  const books = useCountUp(totalBooks);
  const pages = useCountUp(totalPages, 2000);

  return (
    <div
      ref={books.ref}
      className="flex items-center justify-center gap-8 lg:gap-12"
    >
      <div className="text-center">
        <p className="text-3xl lg:text-4xl font-extrabold text-slate-900 tabular-nums tracking-tight">
          {minYear}
        </p>
        <p className="text-xs lg:text-sm text-slate-400 mt-1 font-medium uppercase tracking-widest">
          年から
        </p>
      </div>
      <div className="w-px h-10 bg-slate-200" />
      <div className="text-center" ref={pages.ref}>
        <p className="text-3xl lg:text-4xl font-extrabold text-slate-900 tabular-nums tracking-tight">
          {books.value.toLocaleString()}
        </p>
        <p className="text-xs lg:text-sm text-slate-400 mt-1 font-medium uppercase tracking-widest">
          冊
        </p>
      </div>
      <div className="w-px h-10 bg-slate-200" />
      <div className="text-center">
        <p className="text-3xl lg:text-4xl font-extrabold text-slate-900 tabular-nums tracking-tight">
          {pages.value.toLocaleString()}
        </p>
        <p className="text-xs lg:text-sm text-slate-400 mt-1 font-medium uppercase tracking-widest">
          ページ
        </p>
      </div>
    </div>
  );
}
