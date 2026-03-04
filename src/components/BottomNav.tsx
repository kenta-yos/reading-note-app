"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import Spinner from "./Spinner";

const navItems = [
  { href: "/", label: "ホーム", icon: "📊" },
  { href: "/books", label: "記録", icon: "📚" },
  { href: "/memo", label: "メモ", icon: "📝" },
  { href: "/discover", label: "新刊", icon: "🔍" },
  { href: "/analytics", label: "分析", icon: "🧠" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    setPending(null);
  }, [pathname]);

  const onScroll = useCallback(() => {
    if (ticking.current) return;
    ticking.current = true;
    requestAnimationFrame(() => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;
      if (Math.abs(delta) > 10) {
        setHidden(delta > 0 && currentY > 60);
        lastScrollY.current = currentY;
      }
      ticking.current = false;
    });
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

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
      className={`lg:hidden fixed left-4 right-4 bg-white rounded-2xl z-50 shadow-xl border border-slate-100 transition-transform duration-300 ${
        hidden ? "translate-y-[calc(100%+24px)]" : "translate-y-0"
      }`}
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
    >
      <div className="grid grid-cols-5">
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
