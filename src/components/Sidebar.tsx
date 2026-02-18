"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "ダッシュボード", icon: "📊" },
  { href: "/books", label: "読書記録", icon: "📚" },
  { href: "/books/new", label: "本を登録", icon: "➕" },
  { href: "/analytics", label: "知識分析", icon: "🧠" },
  { href: "/goals", label: "年間目標", icon: "🎯" },
  { href: "/categories", label: "カテゴリ管理", icon: "🗂️" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-56 min-h-screen bg-slate-900 text-white flex-col py-6 px-4 shrink-0">
      <h1 className="text-xl font-bold mb-8 px-2 text-blue-300">
        ScholarGraph
      </h1>
      <nav className="flex flex-col gap-1">
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
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
