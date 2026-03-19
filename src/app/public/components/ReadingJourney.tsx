"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { journeyEntries, type JourneyEntry } from "../data/journey";

/* ─── tree helpers ─── */
type TreeNode = JourneyEntry & { children: TreeNode[] };

function buildTree(entries: JourneyEntry[]): TreeNode | null {
  const map = new Map<string, TreeNode>();
  entries.forEach((e) => map.set(e.id, { ...e, children: [] }));
  let root: TreeNode | null = null;
  entries.forEach((e) => {
    const node = map.get(e.id)!;
    if (e.parentId === null) {
      root = node;
    } else {
      map.get(e.parentId)?.children.push(node);
    }
  });
  return root;
}

/* ─── flat list for rendering (DFS order with depth) ─── */
type FlatNode = TreeNode & { depth: number; parentTitle: string | null };

function flatten(node: TreeNode, depth = 0, parentTitle: string | null = null): FlatNode[] {
  const result: FlatNode[] = [{ ...node, depth, parentTitle }];
  node.children.forEach((child) => {
    result.push(...flatten(child, depth + 1, node.title));
  });
  return result;
}

/* ─── connector drawing ─── */
type ConnectorLine = {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  ongoing: boolean;
};

/* ─── component ─── */
export default function ReadingJourney() {
  const tree = buildTree(journeyEntries);
  const nodes = tree ? flatten(tree) : [];

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [connectors, setConnectors] = useState<ConnectorLine[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());

  const setCardRef = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      if (el) cardRefs.current.set(id, el);
      else cardRefs.current.delete(id);
    },
    []
  );

  /* compute connector lines */
  const computeConnectors = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    const lines: ConnectorLine[] = [];

    journeyEntries.forEach((entry) => {
      if (!entry.parentId) return;
      const parentEl = cardRefs.current.get(entry.parentId);
      const childEl = cardRefs.current.get(entry.id);
      if (!parentEl || !childEl) return;

      const pRect = parentEl.getBoundingClientRect();
      const chRect = childEl.getBoundingClientRect();

      // from parent's branch indicator (left side) bottom
      // to child's branch indicator (left side) top
      const x1 = pRect.left - cRect.left + 6;
      const y1 = pRect.bottom - cRect.top;
      const x2 = chRect.left - cRect.left + 6;
      const y2 = chRect.top - cRect.top;

      lines.push({
        key: `${entry.parentId}-${entry.id}`,
        x1,
        y1,
        x2,
        y2,
        ongoing: entry.ongoing,
      });
    });

    setConnectors(lines);
  }, []);

  useEffect(() => {
    computeConnectors();
    const ro = new ResizeObserver(() => computeConnectors());
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [computeConnectors, expandedId]);

  /* fade-in on scroll */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.entryId;
            if (id) setVisibleIds((prev) => new Set(prev).add(id));
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    cardRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  /* recompute connectors after visibility animations settle */
  useEffect(() => {
    const timer = setTimeout(computeConnectors, 800);
    return () => clearTimeout(timer);
  }, [visibleIds, computeConnectors]);

  return (
    <section className="mb-16">
      <h2 className="text-xl lg:text-2xl font-bold text-slate-800 text-center mb-2">
        読書遍歴
      </h2>
      <p className="text-sm text-slate-400 text-center mb-10">
        芋づる式に広がってきた関心の軌跡
      </p>

      <div ref={containerRef} className="relative">
        {/* SVG connectors */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 0 }}
        >
          {connectors.map((c) => {
            const midY = (c.y1 + c.y2) / 2;
            return (
              <path
                key={c.key}
                d={`M ${c.x1} ${c.y1} C ${c.x1} ${midY}, ${c.x2} ${midY}, ${c.x2} ${c.y2}`}
                fill="none"
                stroke="#1a5276"
                strokeWidth={1.5}
                strokeOpacity={c.ongoing ? 0.35 : 0.15}
                strokeDasharray={c.ongoing ? "none" : "6 4"}
                className="transition-all duration-700"
              />
            );
          })}
        </svg>

        {/* Cards */}
        <div className="relative" style={{ zIndex: 1 }}>
          {nodes.map((node) => {
            const isExpanded = expandedId === node.id;
            const isVisible = visibleIds.has(node.id);
            const isRoot = node.parentId === null;

            return (
              <div
                key={node.id}
                data-entry-id={node.id}
                ref={setCardRef(node.id)}
                className={`
                  mb-4 transition-all duration-700 ease-out cursor-pointer
                  ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}
                `}
                style={{
                  marginLeft: `${node.depth * 2}rem`,
                  transitionDelay: `${node.depth * 100}ms`,
                }}
                onClick={() => setExpandedId(isExpanded ? null : node.id)}
              >
                <div
                  className={`
                    rounded-xl border p-4 lg:p-5 transition-all duration-300
                    ${isRoot
                      ? "bg-[#1a5276] text-white border-[#1a5276] shadow-md"
                      : node.ongoing
                        ? "bg-white border-l-[3px] border-l-[#1a5276] border-slate-200 shadow-sm hover:shadow-md"
                        : "bg-white border-l-[3px] border-l-slate-300 border-slate-200 shadow-sm hover:shadow-md"
                    }
                  `}
                >
                  {/* Header row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Ongoing pulse dot */}
                    {node.ongoing && !isRoot && (
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-[#1a5276] opacity-40 animate-ping" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#1a5276]" />
                      </span>
                    )}

                    <h3
                      className={`text-sm lg:text-base font-semibold ${isRoot ? "text-white" : "text-slate-800"}`}
                    >
                      {node.title}
                    </h3>

                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                        isRoot
                          ? "bg-white/20 text-white/90"
                          : node.ongoing
                            ? "bg-[#1a527612] text-[#1a5276]"
                            : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {node.period}
                    </span>

                    {/* Parent breadcrumb */}
                    {node.parentTitle && (
                      <span
                        className={`text-[11px] ${isRoot ? "text-white/60" : "text-slate-400"}`}
                      >
                        ← {node.parentTitle}
                      </span>
                    )}

                    {/* Expand indicator */}
                    <svg
                      className={`ml-auto w-4 h-4 shrink-0 transition-transform duration-300 ${
                        isRoot ? "text-white/60" : "text-slate-400"
                      } ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Expandable content */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isExpanded ? "max-h-[600px] opacity-100 mt-3" : "max-h-0 opacity-0"
                    }`}
                  >
                    <p
                      className={`text-sm leading-relaxed mb-3 ${
                        isRoot ? "text-white/85" : "text-slate-600"
                      }`}
                    >
                      {node.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {node.books.map((book) => (
                        <span
                          key={book.title}
                          className={`inline-flex items-center text-[11px] rounded-md px-2 py-0.5 ${
                            isRoot
                              ? "bg-white/15 text-white/90"
                              : "bg-slate-50 text-slate-500"
                          }`}
                        >
                          <span
                            className={`font-medium ${isRoot ? "text-white" : "text-slate-700"}`}
                          >
                            {book.title}
                          </span>
                          <span
                            className={`mx-1 ${isRoot ? "text-white/40" : "text-slate-300"}`}
                          >
                            |
                          </span>
                          {book.author}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-slate-400 text-center mt-6">
        ※ この読書遍歴は、読書記録データをもとに生成AIが作成したものです
      </p>
    </section>
  );
}
