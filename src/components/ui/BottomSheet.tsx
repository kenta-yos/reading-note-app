"use client";

import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

export default function BottomSheet({ open, onClose, title, children }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragDelta = useRef(0);
  const isDragging = useRef(false);
  const contentScrollTop = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    // Check if the touch target is inside a scrollable area that has scrolled
    const target = e.target as HTMLElement;
    const scrollable = target.closest("[data-bottom-sheet-body]");
    if (scrollable && scrollable.scrollTop > 0) {
      contentScrollTop.current = scrollable.scrollTop;
      return;
    }

    contentScrollTop.current = 0;
    dragStartY.current = e.touches[0].clientY;
    isDragging.current = true;
    dragDelta.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || contentScrollTop.current > 0) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    dragDelta.current = Math.max(0, delta); // only allow downward drag
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${dragDelta.current}px)`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (dragDelta.current > 100) {
      onClose();
    }
    if (sheetRef.current) {
      sheetRef.current.style.transform = "";
    }
    dragDelta.current = 0;
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl animate-slide-up transition-transform"
        style={{
          maxHeight: "85vh",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {title && (
          <div className="px-5 pb-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
          </div>
        )}

        {/* Scrollable body */}
        <div
          data-bottom-sheet-body
          className="overflow-y-auto"
          style={{ maxHeight: "calc(85vh - 60px)" }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
