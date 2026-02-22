"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "ホーム", icon: "📊" },
  { href: "/books", label: "記録", icon: "📚" },
  { href: "/books/new", label: "登録", icon: "➕" },
  { href: "/analytics", label: "分析", icon: "🧠" },
  { href: "/goals", label: "目標", icon: "🎯" },
  { href: "/categories", label: "カテゴリ", icon: "🗂️" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 z-50">
      <div className="flex" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href ||
                (pathname.startsWith(item.href + "/") &&
                  !navItems.some(
                    (other) =>
                      other.href !== item.href &&
                      other.href.startsWith(item.href) &&
                      pathname.startsWith(other.href)
                  ));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 text-center transition-colors min-h-[60px] ${
                isActive ? "text-blue-400" : "text-slate-400"
              }`}
            >
              <span className="text-2xl leading-none">{item.icon}</span>
              <span className="text-[11px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
