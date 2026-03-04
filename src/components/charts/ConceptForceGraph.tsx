"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ConceptGraphData } from "@/lib/concepts";

type PositionedNode = {
  concept: string; totalCount: number; peakYear: number;
  x: number; y: number; r: number; labelW: number; color: string;
};
type PositionedEdge = {
  x1: number; y1: number; x2: number; y2: number; strength: number; key: string;
  source: string; target: string;
};
type ConceptBook = {
  id: string; title: string; author: string | null;
  readAt: string | null; rating: number | null;
};

function yearToColor(year: number, minYear: number, maxYear: number): string {
  if (minYear === maxYear) return "#6366f1";
  const t = (year - minYear) / (maxYear - minYear);
  const stops = [[96,165,250],[139,92,246],[245,101,101],[249,115,22]];
  const seg = Math.min(Math.floor(t * (stops.length - 1)), stops.length - 2);
  const lt = t * (stops.length - 1) - seg;
  const [r1,g1,b1] = stops[seg], [r2,g2,b2] = stops[seg+1];
  return `rgb(${Math.round(r1+(r2-r1)*lt)},${Math.round(g1+(g2-g1)*lt)},${Math.round(b1+(b2-b1)*lt)})`;
}

// SVG 座標空間。viewBox で width:100% に自動スケール
const W = 1100;
const H = 900;
const CHAR_W = 12;   // fontSize=11 の日本語1文字あたりの幅（SVG単位）
const LABEL_H = 18;  // ラベル矩形の高さ（SVG単位）
const LABEL_PAD_Y = 4; // ノード下端からラベル上端までの余白

export default function ConceptForceGraph({ data }: { data: ConceptGraphData }) {
  const [graph, setGraph] = useState<{ nodes: PositionedNode[]; edges: PositionedEdge[] } | null>(null);
  const [tooltip, setTooltip] = useState<{
    concept: string; totalCount: number; peakYear: number; clientX: number; clientY: number;
  } | null>(null);
  const [clicked, setClicked] = useState<string | null>(null);
  const [books, setBooks] = useState<ConceptBook[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [description, setDescription] = useState<string | null>(null);
  const [descLoading, setDescLoading] = useState(false);

  useEffect(() => {
    if (!data.nodes.length) return;
    import("d3").then((d3) => {
      const maxCount = Math.max(...data.nodes.map((n) => n.totalCount));
      const rScale = d3.scaleSqrt().domain([0, maxCount]).range([12, 44]);

      type SimNode = d3.SimulationNodeDatum & {
        concept: string; totalCount: number; peakYear: number; r: number; labelW: number;
      };
      type SimLink = d3.SimulationLinkDatum<SimNode> & { strength: number };

      // リング状初期配置
      const total = data.nodes.length;
      const initR = Math.min(W, H) * 0.28;
      const simNodes: SimNode[] = data.nodes.map((n, i) => {
        const angle = (i / total) * 2 * Math.PI;
        const r = rScale(n.totalCount);
        const labelW = n.concept.length * CHAR_W + 16;
        return {
          ...n, r, labelW,
          x: W / 2 + Math.cos(angle) * initR + (Math.random() - 0.5) * 20,
          y: H / 2 + Math.sin(angle) * initR + (Math.random() - 0.5) * 20,
        };
      });

      const nodeById = new Map(simNodes.map((n) => [n.concept, n]));
      const simLinks: SimLink[] = data.edges
        .filter((e) => nodeById.has(e.source) && nodeById.has(e.target))
        .map((e) => ({ ...e }));

      // ─── シミュレーション ────────────────────────────────────────
      // forceX / forceY を完全廃止：「各ノードを中心へ引き寄せる」圧力が
      // 境界クランプと組み合わさると同座標に重なりを生むのを防ぐ。
      // forceCenter だけ使う（グラフ全体の重心を中心に移動するだけで個別圧力なし）
      d3.forceSimulation(simNodes)
        .force("link", d3.forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.concept)
          .distance((d) => Math.max(150, 320 - d.strength * 14)))
        .force("charge", d3.forceManyBody().strength(-3200))
        .force("center", d3.forceCenter(W / 2, H / 2))
        .force("collision", d3.forceCollide<SimNode>()
          // 円半径＋ラベル縦余白 と ラベル幅の半分＋横余白 の大きい方
          .radius((d) => Math.max(d.r + 60, d.labelW / 2 + 18))
          .iterations(12))
        .stop()
        .tick(300);

      // ─── クランプ関数（境界内に収める） ─────────────────────────
      const clampNode = (n: SimNode) => {
        const mx = Math.max(n.r + 20, n.labelW / 2 + 20);
        const yTop = n.r + 20;
        const yBot = n.r + LABEL_PAD_Y + LABEL_H + 20;
        n.x = Math.max(mx, Math.min(W - mx, n.x ?? W / 2));
        n.y = Math.max(yTop, Math.min(H - yBot, n.y ?? H / 2));
      };

      // 最初に全ノードをクランプ
      simNodes.forEach(clampNode);

      // ─── ポスト処理：重なりゼロ保証 ─────────────────────────────
      // forceCollide は近似計算のため、シミュレーション後も重なりが残る場合がある。
      // 全ペアを総当たりでチェックし、重なっていれば強制的に押し離す。
      // 押した直後に即クランプすることで「境界デッドロック」を防ぐ。
      for (let pass = 0; pass < 80; pass++) {
        let moved = false;

        for (let i = 0; i < simNodes.length; i++) {
          for (let j = i + 1; j < simNodes.length; j++) {
            const a = simNodes[i], b = simNodes[j];
            const ax = a.x!, ay = a.y!, bx = b.x!, by = b.y!;

            // ① 円同士の重なり
            const dx = bx - ax, dy = by - ay;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minCircle = a.r + b.r + 16;
            if (dist < minCircle) {
              const push = (minCircle - dist) / 2 + 1;
              if (dist < 0.01) {
                a.x = ax - 2; b.x = bx + 2;
              } else {
                const nx = dx / dist, ny = dy / dist;
                a.x = ax - nx * push; a.y = ay - ny * push;
                b.x = bx + nx * push; b.y = by + ny * push;
              }
              // 即クランプ：境界に当たった場合はそこで止まり、もう一方が多めに移動
              clampNode(a); clampNode(b);
              moved = true;
              continue;
            }

            // ② ラベル同士の矩形重なり
            // ラベルは各ノードの下に配置。中心 Y = node.y + r + PAD + LABEL_H/2
            const aLY = ay + a.r + LABEL_PAD_Y + LABEL_H / 2;
            const bLY = by + b.r + LABEL_PAD_Y + LABEL_H / 2;
            const horizOvlp = Math.abs(a.x! - b.x!) < (a.labelW + b.labelW) / 2 + 8;
            const vertOvlp  = Math.abs(aLY - bLY) < LABEL_H + 2;
            if (horizOvlp && vertOvlp) {
              const needed = (a.labelW + b.labelW) / 2 + 8;
              const cur    = Math.abs(a.x! - b.x!);
              const push   = (needed - cur) / 2 + 1;
              const dir    = a.x! <= b.x! ? -1 : 1;
              a.x = a.x! + dir * push;
              b.x = b.x! - dir * push;
              clampNode(a); clampNode(b);
              moved = true;
            }
          }
        }
        if (!moved) break; // 重なりゼロ確認 → 早期終了
      }

      setGraph({
        nodes: simNodes.map((n) => ({
          concept: n.concept, totalCount: n.totalCount, peakYear: n.peakYear,
          x: n.x!, y: n.y!, r: n.r, labelW: n.labelW,
          color: yearToColor(n.peakYear, data.minYear, data.maxYear),
        })),
        edges: simLinks.map((l) => {
          const s = l.source as SimNode, t = l.target as SimNode;
          return { x1: s.x!, y1: s.y!, x2: t.x!, y2: t.y!, strength: l.strength, key: `${s.concept}-${t.concept}`, source: s.concept, target: t.concept };
        }),
      });
    });
  }, [data]);

  useEffect(() => {
    if (!clicked) { setBooks([]); setDescription(null); return; }
    setBooksLoading(true); setDescLoading(true); setDescription(null);
    fetch(`/api/concepts/books?concept=${encodeURIComponent(clicked)}`)
      .then((r) => r.json()).then(setBooks).catch(() => setBooks([]))
      .finally(() => setBooksLoading(false));
    fetch(`/api/concepts/description?concept=${encodeURIComponent(clicked)}`)
      .then((r) => r.json()).then((d) => setDescription(d.description ?? null)).catch(() => setDescription(null))
      .finally(() => setDescLoading(false));
  }, [clicked]);

  // ── ドラッグ機能 ──────────────────────────────────────
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ concept: string; offsetX: number; offsetY: number } | null>(null);
  const didDragRef = useRef(false);

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
      dragRef.current = { concept, offsetX: node.x - svgPt.x, offsetY: node.y - svgPt.y };
      didDragRef.current = false;
      (e.target as Element).setPointerCapture(e.pointerId);
      setTooltip(null);
    },
    [graph, screenToSVG]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current || !graph) return;
      didDragRef.current = true;
      const { concept, offsetX, offsetY } = dragRef.current;
      const svgPt = screenToSVG(e.clientX, e.clientY);
      const newX = Math.max(20, Math.min(W - 20, svgPt.x + offsetX));
      const newY = Math.max(20, Math.min(H - 20, svgPt.y + offsetY));
      setGraph({
        nodes: graph.nodes.map((n) => n.concept === concept ? { ...n, x: newX, y: newY } : n),
        edges: graph.edges.map((edge) => {
          if (edge.source === concept) return { ...edge, x1: newX, y1: newY };
          if (edge.target === concept) return { ...edge, x2: newX, y2: newY };
          return edge;
        }),
      });
    },
    [graph, screenToSVG]
  );

  const handlePointerUp = useCallback(() => { dragRef.current = null; }, []);

  if (!data.nodes.length) {
    return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">データがありません</div>;
  }

  return (
    <div className="relative w-full">
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
        /* viewBox で width:100% → コンテナ幅に自動スケール。
           高さが余れば縦スクロール発生（全体像は常に見える） */
        <div className="overflow-auto rounded-lg border border-slate-100 bg-slate-50">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            style={{ display: "block", minWidth: 320, touchAction: "none" }}
            onClick={(e) => { if ((e.target as SVGElement).tagName === "svg") setClicked(null); }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {graph.edges.map((e) => (
              <line key={e.key} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                stroke="#cbd5e1" strokeWidth={Math.min(e.strength * 0.9, 5)} strokeOpacity={0.5} />
            ))}
            {graph.nodes.map((n) => {
              const isClicked = clicked === n.concept;
              return (
                <g key={n.concept} transform={`translate(${n.x},${n.y})`}
                  className="cursor-grab active:cursor-grabbing"
                  onPointerDown={(e) => handlePointerDown(e, n.concept)}
                  onMouseEnter={(e) => { if (!dragRef.current) setTooltip({ ...n, clientX: e.clientX, clientY: e.clientY }); }}
                  onMouseMove={(e) => { if (!dragRef.current) setTooltip((p) => p ? { ...p, clientX: e.clientX, clientY: e.clientY } : null); }}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={(e) => { if (!didDragRef.current) { e.stopPropagation(); setClicked((p) => p === n.concept ? null : n.concept); setTooltip(null); } }}
                >
                  {isClicked && <circle r={n.r + 5} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeOpacity={0.7} />}
                  <circle r={n.r} fill={n.color} fillOpacity={isClicked ? 1 : 0.82}
                    stroke="white" strokeWidth={isClicked ? 3 : 2} />
                  <rect
                    x={-n.labelW / 2} y={n.r + LABEL_PAD_Y}
                    width={n.labelW} height={LABEL_H}
                    fill="white" fillOpacity={0.9} rx={3} style={{ pointerEvents: "none" }}
                  />
                  <text
                    y={n.r + LABEL_PAD_Y + 13} textAnchor="middle" fontSize={11}
                    fill={isClicked ? "#3b82f6" : "#334155"} fontWeight={isClicked ? "700" : "600"}
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {n.concept}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* ツールチップ（viewport 固定座標） */}
      {tooltip && !clicked && (
        <div className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs pointer-events-none"
          style={{ left: tooltip.clientX, top: tooltip.clientY, transform: "translate(-50%, calc(-100% - 12px))" }}
        >
          <p className="font-semibold text-slate-800 mb-1">{tooltip.concept}</p>
          <p className="text-slate-500">蓄積回数: <span className="font-medium text-slate-700">{tooltip.totalCount}</span></p>
          {tooltip.peakYear > 0 && (
            <p className="text-slate-500">ピーク: <span className="font-medium text-slate-700">{tooltip.peakYear}年</span></p>
          )}
          <p className="text-slate-400 mt-1">タップで本を表示</p>
        </div>
      )}

      {clicked && (
        <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-blue-100">
            <p className="text-xs font-semibold text-blue-700">
              「{clicked}」が登場する本
              {!booksLoading && books.length > 0 && (
                <span className="ml-1.5 font-normal text-blue-500">（{books.length}冊）</span>
              )}
            </p>
            <button onClick={() => setClicked(null)} className="text-xs text-blue-400 hover:text-blue-600 transition-colors">
              閉じる
            </button>
          </div>
          {(descLoading || description) && (
            <div className="px-3 py-2 border-b border-blue-100 text-xs text-slate-600 leading-relaxed">
              {descLoading ? <span className="text-slate-400 italic">説明を生成中…</span> : description}
            </div>
          )}
          <div className="px-3 py-2">
            {booksLoading ? (
              <p className="text-xs text-slate-400 py-1">読み込み中…</p>
            ) : books.length === 0 ? (
              <p className="text-xs text-slate-400 py-1">該当する本が見つかりません</p>
            ) : (
              <div className="space-y-0.5">
                {books.map((b) => (
                  <div key={b.id} className="flex items-center gap-2 px-2 py-1.5">
                    <span className="flex-1 text-xs text-slate-700 font-medium truncate">{b.title}</span>
                    {b.author && <span className="text-xs text-slate-400 shrink-0 truncate max-w-[90px] hidden sm:block">{b.author}</span>}
                    {b.readAt && <span className="text-xs text-slate-300 shrink-0">{new Date(b.readAt).getFullYear()}年</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
