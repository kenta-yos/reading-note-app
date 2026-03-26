"use client";

import { useEffect, useState, useRef } from "react";

const sections = [
  { id: "about", label: "About" },
  { id: "activities", label: "活動" },
  { id: "journey", label: "読書遍歴" },
  { id: "concepts", label: "知識マップ" },
  { id: "booklist", label: "読了本" },
];

export default function SectionNav() {
  const [active, setActive] = useState("");
  const [visible, setVisible] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      // ヘッダーを過ぎたら表示
      setVisible(window.scrollY > 300);

      // アクティブセクション判定
      const navHeight = navRef.current?.offsetHeight ?? 48;
      let current = "";
      for (const { id } of sections) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top - navHeight - 20;
        if (top <= 0) current = id;
      }
      setActive(current);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      ref={navRef}
      className={`sticky top-0 z-40 transition-all duration-300 ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-2 pointer-events-none"
      }`}
      style={{ backgroundColor: "rgba(250,249,246,0.85)", backdropFilter: "blur(12px)" }}
    >
      <div className="max-w-3xl mx-auto px-4">
        <ul className="flex items-center justify-center gap-1 py-2 overflow-x-auto no-scrollbar">
          {sections.map(({ id, label }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(id);
                  if (!el) return;
                  const navHeight = navRef.current?.offsetHeight ?? 48;
                  const top = el.getBoundingClientRect().top + window.scrollY - navHeight - 8;
                  window.scrollTo({ top, behavior: "smooth" });
                }}
                className={`block px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  active === id
                    ? "bg-slate-800 text-white"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
