"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Spinner from "./Spinner";

const navItems = [
  { href: "/", label: "ホーム", icon: "📊" },
  { href: "/books", label: "記録", icon: "📚" },
  { href: "/analytics", label: "分析", icon: "🧠" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

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
    <nav
      className="lg:hidden fixed left-4 right-4 bg-white rounded-2xl z-50 shadow-xl border border-slate-100"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
    >
      <div className="grid grid-cols-3">
        {navItems.map((item, idx) => {
          const active = isActive(item.href);
          const loading = pending === item.href;
          const isFirst = idx === 0;
          const isLast = idx === navItems.length - 1;

          return (
            <button
              key={item.href}
              onClick={() => handleTap(item.href)}
              disabled={pending !== null && !loading}
              aria-label={item.label}
              className={[
                "flex flex-col items-center justify-center h-[64px]",
                "transition-colors duration-150 relative",
                isFirst ? "rounded-l-2xl" : "",
                isLast ? "rounded-r-2xl" : "",
                active ? "" : "active:bg-slate-50",
              ].join(" ")}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full bg-blue-500" />
              )}

              {loading ? (
                <Spinner className="w-6 h-6 text-blue-400" />
              ) : (
                <span
                  className={[
                    "leading-none transition-all duration-150",
                    active ? "text-[26px]" : "text-[22px]",
                  ].join(" ")}
                >
                  {item.icon}
                </span>
              )}

              <span
                className={[
                  "mt-0.5 text-[10px] leading-none font-medium transition-colors duration-150",
                  active ? "text-blue-500 font-semibold" : "text-slate-400",
                ].join(" ")}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
