"use client";

import { useEffect, useRef, useState } from "react";
import type { ConceptGraphData } from "@/lib/concepts";

type PositionedNode = {
  concept: string;
  totalCount: number;
  peakYear: number;
  x: number;
  y: number;
  r: number;
  color: string;
};

type PositionedEdge = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strength: number;
  key: string;
};

type ConceptBook = {
  id: string;
  title: string;
  author: string | null;
  readAt: string | null;
  rating: number | null;
};

// Warm-cool color scale: old = blue, new = orange-red
function yearToColor(year: number, minYear: number, maxYear: number): string {
  if (minYear === maxYear) return "#6366f1";
  const t = (year - minYear) / (maxYear - minYear);
  const stops = [
    [96, 165, 250],   // blue-400
    [139, 92, 246],   // violet-500
    [245, 101, 101],  // red-400
    [249, 115, 22],   // orange-500
  ];
  const seg = Math.min(Math.floor(t * (stops.length - 1)), stops.length - 2);
  const localT = t * (stops.length - 1) - seg;
  const [r1, g1, b1] = stops[seg];
  const [r2, g2, b2] = stops[seg + 1];
  const r = Math.round(r1 + (r2 - r1) * localT);
  const g = Math.round(g1 + (g2 - g1) * localT);
  const b = Math.round(b1 + (b2 - b1) * localT);
  return `rgb(${r},${g},${b})`;
}

const W = 680;
const H = 640;

export default function ConceptForceGraph({ data }: { data: ConceptGraphData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [graph, setGraph] = useState<{ nodes: PositionedNode[]; edges: PositionedEdge[] } | null>(null);
  const [tooltip, setTooltip] = useState<{ concept: string; totalCount: number; peakYear: number; x: number; y: number } | null>(null);
  const [clicked, setClicked] = useState<string | null>(null);
  const [books, setBooks] = useState<ConceptBook[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);

  useEffect(() => {
    if (!data.nodes.length) return;

    import("d3").then((d3) => {
      const maxCount = Math.max(...data.nodes.map((n) => n.totalCount));
      const rScale = d3.scaleSqrt().domain([0, maxCount]).range([10, 42]);

      type SimNode = d3.SimulationNodeDatum & {
        concept: string;
        totalCount: number;
        peakYear: number;
        r: number;
      };

      type SimLink = d3.SimulationLinkDatum<SimNode> & { strength: number };

      const simNodes: SimNode[] = data.nodes.map((n) => ({
        ...n,
        r: rScale(n.totalCount),
        x: W / 2 + (Math.random() - 0.5) * 200,
        y: H / 2 + (Math.random() - 0.5) * 200,
      }));

      const nodeById = new Map(simNodes.map((n) => [n.concept, n]));

      const simLinks: SimLink[] = data.edges
        .filter((e) => nodeById.has(e.source) && nodeById.has(e.target))
        .map((e) => ({ ...e }));

      const simulation = d3
        .forceSimulation(simNodes)
        .force(
          "link",
          d3
            .forceLink<SimNode, SimLink>(simLinks)
            .id((d) => d.concept)
            .distance((d) => Math.max(90, 200 - d.strength * 8))
        )
        .force("charge", d3.forceManyBody().strength(-600))
        .force("center", d3.forceCenter(W / 2, H / 2))
        .force("x", d3.forceX(W / 2).strength(0.04))
        .force("y", d3.forceY(H / 2).strength(0.04))
        .force(
          "collision",
          d3.forceCollide<SimNode>().radius((d) => d.r + 20)
        )
        .stop();

      simulation.tick(500);

      for (const n of simNodes) {
        n.x = Math.max(n.r + 40, Math.min(W - n.r - 40, n.x ?? W / 2));
        n.y = Math.max(n.r + 40, Math.min(H - n.r - 40, n.y ?? H / 2));
      }

      const posNodes: PositionedNode[] = simNodes.map((n) => ({
        concept: n.concept,
        totalCount: n.totalCount,
        peakYear: n.peakYear,
        x: n.x!,
        y: n.y!,
        r: n.r,
        color: yearToColor(n.peakYear, data.minYear, data.maxYear),
      }));

      const posEdges: PositionedEdge[] = simLinks.map((l) => {
        const s = l.source as SimNode;
        const t = l.target as SimNode;
        return {
          x1: s.x!,
          y1: s.y!,
          x2: t.x!,
          y2: t.y!,
          strength: l.strength,
          key: `${s.concept}-${t.concept}`,
        };
      });

      setGraph({ nodes: posNodes, edges: posEdges });
    });
  }, [data]);

  // クリックされた概念の本を取得
  useEffect(() => {
    if (!clicked) {
      setBooks([]);
      return;
    }
    setBooksLoading(true);
    fetch(`/api/concepts/books?concept=${encodeURIComponent(clicked)}`)
      .then((r) => r.json())
      .then(setBooks)
      .catch(() => setBooks([]))
      .finally(() => setBooksLoading(false));
  }, [clicked]);

  if (!data.nodes.length) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        データがありません
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Color legend */}
      <div className="flex items-center gap-2 mb-3 text-xs text-slate-500">
        <span>古い</span>
        <div className="flex-1 h-2 rounded-full" style={{
          background: "linear-gradient(to right, rgb(96,165,250), rgb(139,92,246), rgb(245,101,101), rgb(249,115,22))"
        }} />
        <span>最近</span>
        <span className="ml-3 text-slate-400">○ サイズ＝蓄積量</span>
      </div>

      {!graph ? (
        <div className="flex items-center justify-center h-[480px] text-slate-400 text-sm gap-2">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          グラフを構築中…
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: "auto", maxHeight: 520 }}
          onClick={(e) => {
            // SVGの背景クリックで選択解除
            if ((e.target as SVGElement).tagName === "svg") setClicked(null);
          }}
        >
          {/* Edges */}
          {graph.edges.map((e) => (
            <line
              key={e.key}
              x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              stroke="#cbd5e1"
              strokeWidth={Math.min(e.strength * 0.9, 5)}
              strokeOpacity={0.5}
            />
          ))}

          {/* Nodes */}
          {graph.nodes.map((n) => {
            const isLarge = n.r >= 30;
            const label = n.concept.length > 8 ? n.concept.slice(0, 7) + "…" : n.concept;
            const isClicked = clicked === n.concept;
            return (
              <g
                key={n.concept}
                transform={`translate(${n.x},${n.y})`}
                className="cursor-pointer"
                onMouseEnter={() => setTooltip({ ...n, x: n.x, y: n.y })}
                onMouseLeave={() => setTooltip(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  setClicked((prev) => (prev === n.concept ? null : n.concept));
                  setTooltip(null);
                }}
              >
                {/* クリック時の外リング */}
                {isClicked && (
                  <circle
                    r={n.r + 5}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    strokeOpacity={0.7}
                  />
                )}
                <circle
                  r={n.r}
                  fill={n.color}
                  fillOpacity={isClicked ? 1 : 0.80}
                  stroke="white"
                  strokeWidth={isClicked ? 3 : 2}
                />
                {isLarge ? (
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={Math.min(n.r * 0.38, 12)}
                    fill="white"
                    fontWeight="700"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {label}
                  </text>
                ) : (
                  <>
                    <rect
                      x={-label.length * 3.5 - 3}
                      y={n.r + 3}
                      width={label.length * 7 + 6}
                      height={16}
                      fill="white"
                      fillOpacity={0.85}
                      rx={3}
                      style={{ pointerEvents: "none" }}
                    />
                    <text
                      y={n.r + 14}
                      textAnchor="middle"
                      fontSize={11}
                      fill={isClicked ? "#3b82f6" : "#334155"}
                      fontWeight={isClicked ? "700" : "600"}
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {label}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      )}

      {/* Hover Tooltip */}
      {tooltip && !clicked && (
        <div
          className="absolute z-10 bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs pointer-events-none"
          style={{
            left: `${(tooltip.x / W) * 100}%`,
            top: `${(tooltip.y / H) * 100}%`,
            transform: "translate(-50%, -120%)",
          }}
        >
          <p className="font-semibold text-slate-800 mb-1">{tooltip.concept}</p>
          <p className="text-slate-500">蓄積回数: <span className="font-medium text-slate-700">{tooltip.totalCount}</span></p>
          {tooltip.peakYear > 0 && (
            <p className="text-slate-500">ピーク: <span className="font-medium text-slate-700">{tooltip.peakYear}年</span></p>
          )}
          <p className="text-slate-400 mt-1">タップで本を表示</p>
        </div>
      )}

      {/* クリック選択中の本リスト */}
      {clicked && (
        <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-blue-100">
            <p className="text-xs font-semibold text-blue-700">
              「{clicked}」が登場する本
              {!booksLoading && books.length > 0 && (
                <span className="ml-1.5 font-normal text-blue-500">（{books.length}冊）</span>
              )}
            </p>
            <button
              onClick={() => setClicked(null)}
              className="text-xs text-blue-400 hover:text-blue-600 transition-colors"
            >
              閉じる
            </button>
          </div>
          <div className="px-3 py-2">
            {booksLoading ? (
              <p className="text-xs text-slate-400 py-1">読み込み中…</p>
            ) : books.length === 0 ? (
              <p className="text-xs text-slate-400 py-1">該当する本が見つかりません</p>
            ) : (
              <div className="space-y-0.5">
                {books.map((b) => (
                  <a
                    key={b.id}
                    href={`/books/${b.id}`}
                    className="flex items-center gap-2 px-2 py-1.5 -mx-2 rounded-lg hover:bg-white transition group"
                  >
                    <span className="flex-1 text-xs text-slate-700 font-medium truncate group-hover:text-blue-600 transition-colors">
                      {b.title}
                    </span>
                    {b.author && (
                      <span className="text-xs text-slate-400 shrink-0 truncate max-w-[90px] hidden sm:block">
                        {b.author}
                      </span>
                    )}
                    {b.readAt && (
                      <span className="text-xs text-slate-300 shrink-0">
                        {new Date(b.readAt).getFullYear()}年
                      </span>
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
