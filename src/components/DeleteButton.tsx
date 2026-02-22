"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "./Spinner";

export default function DeleteButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await fetch(`/api/books/${id}`, { method: "DELETE" });
      router.push("/books");
      router.refresh();
    } catch {
      setDeleting(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <span className="text-sm text-slate-500">削除しますか？</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 active:scale-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {deleting ? (
            <>
              <Spinner className="w-3.5 h-3.5" />
              <span>削除中...</span>
            </>
          ) : (
            "削除する"
          )}
        </button>
        {!deleting && (
          <button
            onClick={() => setConfirming(false)}
            className="px-3 py-1.5 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 active:scale-95 transition"
          >
            キャンセル
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 active:scale-95 transition"
    >
      削除
    </button>
  );
}
