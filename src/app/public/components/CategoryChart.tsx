"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6",
  "#ef4444", "#06b6d4", "#f97316", "#84cc16",
  "#94a3b8", "#e879f9", "#22d3ee", "#a3e635",
];

type CategoryData = { category: string; count: number };

type Props = {
  data: CategoryData[];
  selectedCategory: string | null;
  onCategoryClick: (category: string | null) => void;
};

export default function CategoryChart({
  data,
  selectedCategory,
  onCategoryClick,
}: Props) {
  if (!data.length) return null;

  // Top 10 + others
  const sorted = [...data].sort((a, b) => b.count - a.count);
  const top = sorted.slice(0, 10);
  const rest = sorted.slice(10);
  const items =
    rest.length > 0
      ? [
          ...top,
          {
            category: "その他",
            count: rest.reduce((s, d) => s + d.count, 0),
          },
        ]
      : top;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-700 mb-1">
        カテゴリ分布
      </h2>
      <p className="text-xs text-slate-400 mb-4">
        カテゴリ別の冊数（クリックで本リストを絞り込み）
      </p>
      <ResponsiveContainer width="100%" height={Math.max(items.length * 36, 160)}>
        <BarChart
          data={items}
          layout="vertical"
          margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="category"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            width={100}
          />
          <Tooltip
            formatter={(v) => [`${v} 冊`, "冊数"]}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
          />
          <Bar
            dataKey="count"
            radius={[0, 4, 4, 0]}
            cursor="pointer"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onClick={(entry: any) => {
              const cat = entry?.category as string | undefined;
              if (!cat) return;
              onCategoryClick(selectedCategory === cat ? null : cat);
            }}
          >
            {items.map((d, i) => (
              <Cell
                key={d.category}
                fill={
                  selectedCategory === d.category
                    ? "#1a5276"
                    : COLORS[i % COLORS.length]
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
