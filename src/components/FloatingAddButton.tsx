"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import Spinner from "./Spinner";

export default function FloatingAddButton() {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  // 記録ページのみ表示
  const isBooksList = pathname === "/books";

  useEffect(() => {
    setLoading(false);
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

  if (!isBooksList) return null;

  // statusパラメータがあれば引き継ぐ
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const status = params?.get("status");
  const href = `/books/new${status ? `?status=${status}` : ""}`;

  return (
    <button
      onClick={() => {
        if (loading) return;
        setLoading(true);
        router.push(href);
      }}
      disabled={loading}
      className={`lg:hidden fixed z-50 w-14 h-14 rounded-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-all duration-300 ${
        hidden ? "translate-y-[calc(100%+24px)]" : "translate-y-0"
      }`}
      style={{
        left: "16px",
        bottom: "calc(env(safe-area-inset-bottom) + 88px)",
      }}
      aria-label="本を登録"
    >
      {loading ? (
        <Spinner className="w-6 h-6 text-white" />
      ) : (
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      )}
    </button>
  );
}
