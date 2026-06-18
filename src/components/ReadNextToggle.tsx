"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./ui/Toast";
import { haptic } from "@/lib/haptics";
import Spinner from "./Spinner";

type Props = {
  bookId: string;
  initialReadNext: boolean;
};

export default function ReadNextToggle({ bookId, initialReadNext }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [readNext, setReadNext] = useState(initialReadNext);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (loading) return;
    const next = !readNext;
    setLoading(true);
    try {
      const res = await fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readNext: next }),
      });
      if (res.ok) {
        setReadNext(next);
        haptic("success");
        toast(next ? "「次に読みたい」に追加しました" : "「次に読みたい」を解除しました");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-pressed={readNext}
      title={readNext ? "次に読みたいを解除" : "次に読みたいに追加"}
      className={`inline-flex items-center gap-1.5 text-sm font-medium rounded-full px-3 py-1.5 border transition-colors ${
        readNext
          ? "bg-purple-50 border-purple-200 text-purple-700"
          : "bg-white border-slate-200 text-slate-500 hover:border-purple-200 hover:text-purple-600"
      }`}
    >
      {loading ? (
        <Spinner className="w-4 h-4 text-purple-400" />
      ) : (
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill={readNext ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21L12 17.5 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" />
        </svg>
      )}
      次に読みたい
    </button>
  );
}
