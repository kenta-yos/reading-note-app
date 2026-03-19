"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ConceptGraphData } from "@/lib/concepts";

type PositionedNode = {
  concept: string;
  totalCount: number;
  peakYear: number;
  x: number;
  y: number;
  r: number;
  labelW: number;
  color: string;
};
type PositionedEdge = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strength: number;
  key: string;
  source: string;
  target: string;
};

function yearToColor(
  year: number,
  minYear: number,
  maxYear: number
): string {
  if (minYear === maxYear) return "#6366f1";
  const t = (year - minYear) / (maxYear - minYear);
  const stops = [
    [96, 165, 250],
    [139, 92, 246],
    [245, 101, 101],
    [249, 115, 22],
  ];
  const seg = Math.min(Math.floor(t * (stops.length - 1)), stops.length - 2);
  const lt = t * (stops.length - 1) - seg;
  const [r1, g1, b1] = stops[seg],
    [r2, g2, b2] = stops[seg + 1];
  return `rgb(${Math.round(r1 + (r2 - r1) * lt)},${Math.round(g1 + (g2 - g1) * lt)},${Math.round(b1 + (b2 - b1) * lt)})`;
}

const W = 1100;
const H = 900;
const CHAR_W = 12;
const LABEL_H = 18;
const LABEL_PAD_Y = 4;

export default function ConceptNetwork({
  data,
}: {
  data: ConceptGraphData;
}) {
  const [graph, setGraph] = useState<{
    nodes: PositionedNode[];
    edges: PositionedEdge[];
  } | null>(null);
  const [tooltip, setTooltip] = useState<{
    concept: string;
    totalCount: number;
    peakYear: number;
    clientX: number;
    clientY: number;
  } | null>(null);

  useEffect(() => {
    if (!data.nodes.length) return;
    import("d3").then((d3) => {
      const maxCount = Math.max(...data.nodes.map((n) => n.totalCount));
      const rScale = d3.scaleSqrt().domain([0, maxCount]).range([12, 44]);

      type SimNode = d3.SimulationNodeDatum & {
        concept: string;
        totalCount: number;
        peakYear: number;
        r: number;
        labelW: number;
      };
      type SimLink = d3.SimulationLinkDatum<SimNode> & { strength: number };

      const total = data.nodes.length;
      const initR = Math.min(W, H) * 0.28;
      const simNodes: SimNode[] = data.nodes.map((n, i) => {
        const angle = (i / total) * 2 * Math.PI;
        const r = rScale(n.totalCount);
        const labelW = n.concept.length * CHAR_W + 16;
        return {
          ...n,
          r,
          labelW,
          x:
            W / 2 +
            Math.cos(angle) * initR +
            (Math.random() - 0.5) * 20,
          y:
            H / 2 +
            Math.sin(angle) * initR +
            (Math.random() - 0.5) * 20,
        };
      });

      const nodeById = new Map(simNodes.map((n) => [n.concept, n]));
      const simLinks: SimLink[] = data.edges
        .filter((e) => nodeById.has(e.source) && nodeById.has(e.target))
        .map((e) => ({ ...e }));

      d3.forceSimulation(simNodes)
        .force(
          "link",
          d3
            .forceLink<SimNode, SimLink>(simLinks)
            .id((d) => d.concept)
            .distance((d) => Math.max(150, 320 - d.strength * 14))
        )
        .force("charge", d3.forceManyBody().strength(-3200))
        .force("center", d3.forceCenter(W / 2, H / 2))
        .force(
          "collision",
          d3
            .forceCollide<SimNode>()
            .radius((d) => Math.max(d.r + 60, d.labelW / 2 + 18))
            .iterations(12)
        )
        .stop()
        .tick(1500);

      const clampNode = (n: SimNode) => {
        const mx = Math.max(n.r + 20, n.labelW / 2 + 20);
        const yTop = n.r + 20;
        const yBot = n.r + LABEL_PAD_Y + LABEL_H + 20;
        n.x = Math.max(mx, Math.min(W - mx, n.x ?? W / 2));
        n.y = Math.max(yTop, Math.min(H - yBot, n.y ?? H / 2));
      };

      simNodes.forEach(clampNode);

      for (let pass = 0; pass < 80; pass++) {
        let moved = false;
        for (let i = 0; i < simNodes.length; i++) {
          for (let j = i + 1; j < simNodes.length; j++) {
            const a = simNodes[i],
              b = simNodes[j];
            const ax = a.x!,
              ay = a.y!,
              bx = b.x!,
              by = b.y!;

            const dx = bx - ax,
              dy = by - ay;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minCircle = a.r + b.r + 16;
            if (dist < minCircle) {
              const push = (minCircle - dist) / 2 + 1;
              if (dist < 0.01) {
                a.x = ax - 2;
                b.x = bx + 2;
              } else {
                const nx = dx / dist,
                  ny = dy / dist;
                a.x = ax - nx * push;
                a.y = ay - ny * push;
                b.x = bx + nx * push;
                b.y = by + ny * push;
              }
              clampNode(a);
              clampNode(b);
              moved = true;
              continue;
            }

            const aLY = ay + a.r + LABEL_PAD_Y + LABEL_H / 2;
            const bLY = by + b.r + LABEL_PAD_Y + LABEL_H / 2;
            const horizOvlp =
              Math.abs(a.x! - b.x!) < (a.labelW + b.labelW) / 2 + 8;
            const vertOvlp = Math.abs(aLY - bLY) < LABEL_H + 2;
            if (horizOvlp && vertOvlp) {
              const needed = (a.labelW + b.labelW) / 2 + 8;
              const cur = Math.abs(a.x! - b.x!);
              const pushH = (needed - cur) / 2 + 1;
              const dir = a.x! <= b.x! ? -1 : 1;
              a.x = a.x! + dir * pushH;
              b.x = b.x! - dir * pushH;
              clampNode(a);
              clampNode(b);
              moved = true;
            }
          }
        }
        if (!moved) break;
      }

      setGraph({
        nodes: simNodes.map((n) => ({
          concept: n.concept,
          totalCount: n.totalCount,
          peakYear: n.peakYear,
          x: n.x!,
          y: n.y!,
          r: n.r,
          labelW: n.labelW,
          color: yearToColor(n.peakYear, data.minYear, data.maxYear),
        })),
        edges: simLinks.map((l) => {
          const s = l.source as SimNode,
            t = l.target as SimNode;
          return {
            x1: s.x!,
            y1: s.y!,
            x2: t.x!,
            y2: t.y!,
            strength: l.strength,
            key: `${s.concept}-${t.concept}`,
            source: s.concept,
            target: t.concept,
          };
        }),
      });
    });
  }, [data]);

  // ── ドラッグ機能 ──────────────────────────────────────
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ concept: string; offsetX: number; offsetY: number } | null>(null);

  const screenToSVG = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: svgPt.x, y: svgPt.y };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, concept: string) => {
      if (!graph) return;
      const node = graph.nodes.find((n) => n.concept === concept);
      if (!node) return;
      const svgPt = screenToSVG(e.clientX, e.clientY);
      dragRef.current = {
        concept,
        offsetX: node.x - svgPt.x,
        offsetY: node.y - svgPt.y,
      };
      (e.target as Element).setPointerCapture(e.pointerId);
      setTooltip(null);
    },
    [graph, screenToSVG]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current || !graph) return;
      const { concept, offsetX, offsetY } = dragRef.current;
      const svgPt = screenToSVG(e.clientX, e.clientY);
      const newX = Math.max(20, Math.min(W - 20, svgPt.x + offsetX));
      const newY = Math.max(20, Math.min(H - 20, svgPt.y + offsetY));

      setGraph({
        nodes: graph.nodes.map((n) =>
          n.concept === concept ? { ...n, x: newX, y: newY } : n
        ),
        edges: graph.edges.map((edge) => {
          if (edge.source === concept) return { ...edge, x1: newX, y1: newY };
          if (edge.target === concept) return { ...edge, x2: newX, y2: newY };
          return edge;
        }),
      });
    },
    [graph, screenToSVG]
  );

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  if (!data.nodes.length) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        データがありません
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl lg:text-2xl font-bold text-slate-800 text-center mb-2">
        知識の地形図
      </h2>
      <p className="text-sm text-slate-500 text-center mb-8">
        円サイズ＝蓄積量、線＝同じ本で共起した関係、色＝ピーク年（青い＝古くから、橙い＝最近）
      </p>

      <div className="relative w-full bg-white rounded-xl border border-slate-200 p-5 shadow-sm">

      <div className="flex items-center gap-2 mb-3 text-xs text-slate-500">
        <span>古い</span>
        <div
          className="flex-1 h-2 rounded-full"
          style={{
            background:
              "linear-gradient(to right, rgb(96,165,250), rgb(139,92,246), rgb(245,101,101), rgb(249,115,22))",
          }}
        />
        <span>最近</span>
        <span className="ml-3 text-slate-400">○ サイズ＝蓄積量</span>
      </div>

      {!graph ? (
        <div className="flex items-center justify-center h-[480px] text-slate-400 text-sm gap-2">
          <svg
            className="animate-spin w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          グラフを構築中…
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border border-slate-100 bg-slate-50">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            style={{ display: "block", minWidth: 320, touchAction: "none" }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {graph.edges.map((e) => (
              <line
                key={e.key}
                x1={e.x1}
                y1={e.y1}
                x2={e.x2}
                y2={e.y2}
                stroke="#cbd5e1"
                strokeWidth={Math.min(e.strength * 0.9, 5)}
                strokeOpacity={0.5}
              />
            ))}
            {graph.nodes.map((n) => (
              <g
                key={n.concept}
                transform={`translate(${n.x},${n.y})`}
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => handlePointerDown(e, n.concept)}
                onMouseEnter={(e) => {
                  if (!dragRef.current)
                    setTooltip({ ...n, clientX: e.clientX, clientY: e.clientY });
                }}
                onMouseMove={(e) => {
                  if (!dragRef.current)
                    setTooltip((p) =>
                      p ? { ...p, clientX: e.clientX, clientY: e.clientY } : null
                    );
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                <circle
                  r={n.r}
                  fill={n.color}
                  fillOpacity={0.82}
                  stroke="white"
                  strokeWidth={2}
                />
                <rect
                  x={-n.labelW / 2}
                  y={n.r + LABEL_PAD_Y}
                  width={n.labelW}
                  height={LABEL_H}
                  fill="white"
                  fillOpacity={0.9}
                  rx={3}
                  style={{ pointerEvents: "none" }}
                />
                <text
                  y={n.r + LABEL_PAD_Y + 13}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#334155"
                  fontWeight="600"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {n.concept}
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}

      {tooltip && (
        <div
          className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs pointer-events-none"
          style={{
            left: tooltip.clientX,
            top: tooltip.clientY,
            transform: "translate(-50%, calc(-100% - 12px))",
          }}
        >
          <p className="font-semibold text-slate-800 mb-1">
            {tooltip.concept}
          </p>
          <p className="text-slate-500">
            蓄積回数:{" "}
            <span className="font-medium text-slate-700">
              {tooltip.totalCount}
            </span>
          </p>
          {tooltip.peakYear > 0 && (
            <p className="text-slate-500">
              ピーク:{" "}
              <span className="font-medium text-slate-700">
                {tooltip.peakYear}年
              </span>
            </p>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
