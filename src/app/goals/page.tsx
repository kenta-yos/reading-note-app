"use client";

import { useEffect, useState } from "react";
import Spinner from "@/components/Spinner";

export default function GoalsPage() {
  const currentYear = new Date().getFullYear();
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);
  const [goalInput, setGoalInput] = useState("");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/years")
      .then((r) => r.json())
      .then((years: number[]) => setAvailableYears(years));
  }, []);

  useEffect(() => {
    setGoalInput("");
    setMessage("");
    fetch(`/api/goals/${selectedYear}`)
      .then((r) => r.json())
      .then((goal) => {
        if (goal?.pageGoal) setGoalInput(String(goal.pageGoal));
      });
  }, [selectedYear]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/goals/${selectedYear}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageGoal: Number(goalInput) }),
      });
      if (!res.ok) throw new Error("保存失敗");
      setMessage("目標を保存しました！");
    } catch {
      setMessage("エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-xl lg:text-2xl font-bold text-slate-800">年間目標の設定</h1>
        <p className="text-slate-500 text-sm mt-0.5">年ごとのページ数目標を設定します</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 lg:p-6 shadow-sm">
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 font-medium">対象年</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}年
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-slate-500 mb-1.5 font-medium">
                目標ページ数
              </label>
              <input
                type="number"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="例：10000"
                min="1"
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:scale-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Spinner className="w-4 h-4" />
                <span>保存中…</span>
              </>
            ) : (
              "保存する"
            )}
          </button>
        </form>

        {message && (
          <p
            className={`mt-3 text-sm font-medium ${
              message.includes("エラー") ? "text-red-600" : "text-emerald-600"
            }`}
          >
            {message.includes("エラー") ? "⚠ " : "✓ "}
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
