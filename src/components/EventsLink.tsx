"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";

export default function EventsLink() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      onClick={() => {
        if (pending) return;
        setPending(true);
        router.push("/events");
      }}
      disabled={pending}
      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap"
    >
      {pending ? (
        <Spinner className="w-3.5 h-3.5" />
      ) : (
        <span>🎤</span>
      )}
      <span>著者イベント</span>
    </button>
  );
}
