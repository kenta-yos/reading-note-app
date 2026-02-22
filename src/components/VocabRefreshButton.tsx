"use client";

import { useState } from "react";
import Spinner from "./Spinner";

type Props = {
  pendingCount: number; // 未処理の本の数
};

export default function VocabRefreshButton({ pendingCount }: Props) {
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleClick = async () => {
    if (state === "running") return;
    setState("running");
    setMessage("処理中…");

    try {
      let remaining = pendingCount;
      let totalProcessed = 0;

      while (remaining > 0) {
        const res = await fetch("/api/vocab-refresh", { method: "POST" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        totalProcessed += data.processed ?? 0;
        remaining = data.remaining ?? 0;

        if (data.done || remaining === 0) break;
        setMessage(`処理中… あと ${remaining} 冊`);
        // 次のバッチまで少し待つ
        await new Promise((r) => setTimeout(r, 2000));
      }

      setState("done");
      setMessage(`完了しました（${totalProcessed} 冊処理）。ページを再読み込みすると反映されます。`);
    } catch (e) {
      setState("error");
      setMessage(`エラーが発生しました: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  if (pendingCount === 0 && state === "idle") return null;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <button
        onClick={handleClick}
        disabled={state === "running" || state === "done"}
        className={[
          "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
          state === "done"
            ? "bg-green-50 text-green-700 border border-green-200 cursor-default"
            : state === "error"
            ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
            : "bg-blue-500 hover:bg-blue-600 text-white shadow-sm",
        ].join(" ")}
      >
        {state === "running" ? (
          <>
            <Spinner className="w-4 h-4 text-white" />
            概念を再抽出中…
          </>
        ) : state === "done" ? (
          "✓ 再抽出完了"
        ) : (
          `🔄 概念を再抽出する（${pendingCount} 冊未処理）`
        )}
      </button>
      {message && (
        <p className={`text-xs ${state === "error" ? "text-red-600" : "text-slate-500"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
