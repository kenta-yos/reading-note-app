"use client";

import { useEffect, useState } from "react";
import GoalComparisonChart from "@/components/charts/GoalComparisonChart";

type GoalData = {
  year: number;
  actual: number;
  goal: number;
};

const YEARS = [2026, 2025, 2024, 2023];

export default function GoalsPage() {
  const currentYear = new Date().getFullYear();
  const [goalInput, setGoalInput] = useState("");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [chartData, setChartData] = useState<GoalData[]>([]);
  const [loadingChart, setLoadingChart] = useState(true);

  useEffect(() => {
    const fetchGoal = async () => {
      const res = await fetch(`/api/goals/${selectedYear}`);
      const goal = await res.json();
      setGoalInput(goal?.pageGoal ? String(goal.pageGoal) : "");
    };
    fetchGoal();
  }, [selectedYear]);

  useEffect(() => {
    const fetchChart = async () => {
      setLoadingChart(true);
      try {
        const results = await Promise.all(
          YEARS.map(async (y) => {
            const [statsRes, goalRes] = await Promise.all([
              fetch(`/api/stats?year=${y}`),
              fetch(`/api/goals/${y}`),
            ]);
            const stats = await statsRes.json();
            const goal = await goalRes.json();
            return {
              year: y,
              actual: stats.totalPages ?? 0,
              goal: goal?.pageGoal ?? 0,
            };
          })
        );
        setChartData(results.filter((d) => d.actual > 0 || d.goal > 0));
      } finally {
        setLoadingChart(false);
      }
    };
    fetchChart();
  }, [saving]);

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
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">年間目標</h1>
        <p className="text-slate-500 text-sm mt-1">年ごとのページ数目標を設定</p>
      </div>

      {/* Goal setting form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-6">
        <h2 className="text-sm font-semibold text-slate-600 mb-4">目標を設定</h2>
        <form onSubmit={handleSave} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-slate-500 mb-1">対象年</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}年
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-40">
            <label className="block text-xs text-slate-500 mb-1">目標ページ数</label>
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
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </form>
        {message && (
          <p className="mt-3 text-sm text-green-600">{message}</p>
        )}
      </div>

      {/* Comparison chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-600 mb-4">
          年間目標 vs 実績
        </h2>
        {loadingChart ? (
          <p className="text-center text-slate-400 text-sm py-8">読み込み中...</p>
        ) : (
          <GoalComparisonChart data={chartData} />
        )}
      </div>
    </div>
  );
}
