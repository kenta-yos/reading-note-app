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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomAngleTick = ({ x, y, cx, cy, payload }: any) => {
  if (!payload) return null;
  const label: string = payload.value;

  // ・で分割して2行表示（例: "哲学・倫理学" → ["哲学", "倫理学"]）
  const parts: string[] = label.includes("・") ? label.split("・") : [label];
  const lineH = 14;
  const EPS = 5;

  const textAnchor =
    x < cx - EPS ? "end" : x > cx + EPS ? "start" : "middle";

  // 上側: テキストを上方向に展開、下側: 下方向、横: 中央揃え
  let startDy: number;
  if (y < cy - EPS) {
    startDy = -(parts.length - 1) * lineH;
  } else if (y > cy + EPS) {
    startDy = 0;
  } else {
    startDy = -((parts.length - 1) * lineH) / 2;
  }

  return (
    <text x={x} y={y} textAnchor={textAnchor} fill="#475569" fontSize={11}>
      {parts.map((part, i) => (
        <tspan key={i} x={x} dy={i === 0 ? startDy : lineH}>
          {i === 0 ? part : `・${part}`}
        </tspan>
      ))}
    </text>
  );
};

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
    subject: d.category,
    strength: Math.round((d.pages / maxPages) * 100),
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart
        data={formatted}
        outerRadius="62%"
        margin={{ top: 20, right: 60, bottom: 20, left: 60 }}
      >
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" tick={<CustomAngleTick />} />
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
