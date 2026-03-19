"use client";

import { useEffect, useRef } from "react";
import { journeyEntries } from "../data/journey";

export default function ReadingJourney() {
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("opacity-100", "translate-y-0");
            entry.target.classList.remove("opacity-0", "translate-y-6");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    itemsRef.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section className="mb-16">
      <h2 className="text-xl lg:text-2xl font-bold text-slate-800 text-center mb-2">
        読書遍歴
      </h2>
      <p className="text-sm text-slate-400 text-center mb-10">
        芋づる式に広がってきた関心の軌跡
      </p>

      <div className="relative pl-8 lg:pl-12">
        {/* Vertical line */}
        <div
          className="absolute left-3 lg:left-5 top-0 bottom-0 w-0.5"
          style={{ backgroundColor: "#1a5276", opacity: 0.2 }}
        />

        {journeyEntries.map((entry, i) => (
          <div
            key={entry.id}
            ref={(el) => { itemsRef.current[i] = el; }}
            className="relative mb-10 last:mb-0 opacity-0 translate-y-6 transition-all duration-700 ease-out"
          >
            {/* Dot */}
            <div
              className="absolute -left-8 lg:-left-12 top-1 w-3 h-3 rounded-full border-2 bg-white"
              style={{ borderColor: "#1a5276" }}
            />

            {/* Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 lg:p-6 shadow-sm">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
                <h3 className="text-base lg:text-lg font-semibold text-slate-800">
                  {entry.title}
                </h3>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "#1a527610", color: "#1a5276" }}
                >
                  {entry.period}
                </span>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                {entry.description}
              </p>

              <div className="flex flex-wrap gap-2">
                {entry.books.map((book) => (
                  <span
                    key={book.title}
                    className="inline-flex items-center text-xs text-slate-500 bg-slate-50 rounded-md px-2.5 py-1"
                  >
                    <span className="font-medium text-slate-700">
                      {book.title}
                    </span>
                    <span className="mx-1 text-slate-300">|</span>
                    {book.author}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
