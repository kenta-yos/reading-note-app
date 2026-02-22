"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Spinner from "./Spinner";

const navItems = [
  { href: "/", label: "ホーム", icon: "📊" },
  { href: "/books", label: "記録", icon: "📚" },
  { href: "/books/new", label: "登録", icon: "➕" },
  { href: "/analytics", label: "分析", icon: "🧠" },
  { href: "/goals", label: "目標", icon: "🎯" },
  { href: "/categories", label: "分類", icon: "🗂️" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  // ページ遷移完了でスピナーを消す
  useEffect(() => {
    setPending(null);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href ||
        (pathname.startsWith(href + "/") &&
          !navItems.some(
            (other) =>
              other.href !== href &&
              other.href.startsWith(href) &&
              pathname.startsWith(other.href)
          ));

  const handleTap = (href: string) => {
    if (isActive(href) || pending !== null) return;
    setPending(href);
    router.push(href);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 z-50">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${navItems.length}, 1fr)`,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {navItems.map((item) => {
          const active = isActive(item.href);
          const loading = pending === item.href;

          return (
            <button
              key={item.href}
              onClick={() => handleTap(item.href)}
              disabled={pending !== null && !loading}
              aria-label={item.label}
              className={[
                "flex flex-col items-center justify-center gap-1 py-3 min-h-[64px]",
                "transition-all duration-150 w-full",
                active
                  ? "text-blue-400"
                  : loading
                  ? "text-blue-300 opacity-90"
                  : "text-slate-400 active:opacity-60 active:scale-95",
              ].join(" ")}
            >
              {loading ? (
                <Spinner className="w-6 h-6" />
              ) : (
                <span className="text-[22px] leading-none">{item.icon}</span>
              )}
              <span className="text-[10px] font-medium leading-none w-full text-center overflow-hidden truncate px-0.5">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
