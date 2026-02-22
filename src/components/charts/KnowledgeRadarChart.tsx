"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { CategoryTotal } from "@/lib/types";

type Props = {
  data: CategoryTotal[];
};

const MAX_CATEGORIES = 8;

export default function KnowledgeRadarChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-52 text-slate-400 text-sm">
        データがありません
      </div>
    );
  }

  const limited = [...data]
    .sort((a, b) => b.pages - a.pages)
    .slice(0, MAX_CATEGORIES);

  const maxPages = Math.max(...limited.map((d) => d.pages), 1);
  const formatted = limited.map((d) => ({
    subject: d.category.length > 6 ? d.category.slice(0, 6) + "…" : d.category,
    strength: Math.round((d.pages / maxPages) * 100),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={formatted}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
        <Radar
          name="知識強度"
          dataKey="strength"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.4}
        />
        <Tooltip formatter={(v) => [`${v}%`, "知識強度"]} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
