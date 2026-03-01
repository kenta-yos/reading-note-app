"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { haptic } from "@/lib/haptics";

const THRESHOLD = 80;
const RESISTANCE = 0.4;

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY !== 0 || refreshing) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, [refreshing]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current) return;
    const delta = (e.touches[0].clientY - startY.current) * RESISTANCE;
    if (delta < 0) {
      pulling.current = false;
      setPullDistance(0);
      return;
    }
    setPullDistance(delta);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      haptic("medium");
      router.refresh();
      // Give the server some time to respond
      setTimeout(() => {
        setRefreshing(false);
        setPullDistance(0);
      }, 1000);
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, router]);

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div
          className="flex justify-center overflow-hidden transition-[height] duration-200"
          style={{ height: refreshing ? 48 : pullDistance }}
        >
          <div className="flex items-center justify-center">
            <svg
              className={`w-5 h-5 text-slate-400 ${refreshing ? "animate-spin-slow" : ""}`}
              style={{
                transform: refreshing ? undefined : `rotate(${Math.min(pullDistance / THRESHOLD, 1) * 360}deg)`,
                opacity: Math.min(pullDistance / THRESHOLD, 1),
              }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
