"use client";

import { useEffect, useRef, useState } from "react";
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

/* ─── card component ─── */
function JourneyCard({
  node,
  isRoot,
  expandedId,
  setExpandedId,
  visibleIds,
  registerRef,
}: {
  node: TreeNode;
  isRoot: boolean;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  visibleIds: Set<string>;
  registerRef: (id: string, el: HTMLDivElement | null) => void;
}) {
  const isExpanded = expandedId === node.id;
  const isVisible = visibleIds.has(node.id);

  // Split title into main + subtitle
  const [mainTitle, subtitle] = node.title.includes("──")
    ? node.title.split("──").map((s) => s.trim())
    : [node.title, null];

  return (
    <div
      data-entry-id={node.id}
      ref={(el) => registerRef(node.id, el)}
      className={`transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
    >
      {/* The card itself */}
      <div
        className={`
          rounded-xl border transition-all duration-300 cursor-pointer p-4 lg:p-5
          ${isRoot
            ? "bg-[#1a5276] text-white border-[#1a5276] shadow-md"
            : node.ongoing
              ? "bg-white border-slate-200 border-l-[3px] border-l-[#1a5276] shadow-sm hover:shadow-md"
              : "bg-white border-slate-200 border-l-[3px] border-l-slate-300 shadow-sm hover:shadow-md"
          }
        `}
        onClick={() => setExpandedId(isExpanded ? null : node.id)}
      >
        {/* Title row */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {node.ongoing && !isRoot && (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[#1a5276] opacity-40 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1a5276]" />
                </span>
              )}
              <h3 className={`text-sm lg:text-base font-bold ${isRoot ? "text-white" : "text-slate-800"}`}>
                {mainTitle}
              </h3>
            </div>
            {subtitle && (
              <p className={`text-xs mt-0.5 ${isRoot ? "text-white/80" : "text-slate-500"}`}>
                {subtitle}
              </p>
            )}
          </div>
          {/* Expand chevron */}
          <svg
            className={`w-4 h-4 shrink-0 mt-0.5 transition-transform duration-300 ${
              isRoot ? "text-white/50" : "text-slate-300"
            } ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Expandable: description + books */}
        <div
          className={`overflow-hidden transition-all duration-300 ${
            isExpanded ? "max-h-[600px] opacity-100 mt-3" : "max-h-0 opacity-0"
          }`}
        >
          <p className={`text-sm leading-relaxed mb-3 ${isRoot ? "text-white/90" : "text-slate-700"}`}>
            {node.description}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {node.books.map((book) => (
              <span
                key={book.title}
                className={`inline-flex items-center text-[11px] rounded-md px-2 py-0.5 ${
                  isRoot ? "bg-white/15 text-white/90" : "bg-slate-100 text-slate-600"
                }`}
              >
                <span className={`font-medium ${isRoot ? "text-white" : "text-slate-700"}`}>
                  {book.title}
                </span>
                <span className={`mx-1 ${isRoot ? "text-white/40" : "text-slate-300"}`}>|</span>
                {book.author}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Children: nested with visual branch connector */}
      {node.children.length > 0 && (
        <div className="relative mt-2 ml-4 lg:ml-6 pl-4 lg:pl-5 border-l-2 border-[#1a5276]/15 space-y-2">
          {node.children.map((child) => (
            <div key={child.id} className="relative">
              {/* Horizontal branch tick */}
              <div className="absolute -left-4 lg:-left-5 top-5 w-3 lg:w-4 h-0 border-t-2 border-[#1a5276]/15" />
              <JourneyCard
                node={child}
                isRoot={false}
                expandedId={expandedId}
                setExpandedId={setExpandedId}
                visibleIds={visibleIds}
                registerRef={registerRef}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── main component ─── */
export default function ReadingJourney() {
  const tree = buildTree(journeyEntries);
  const cardElsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());

  const registerRef = (id: string, el: HTMLDivElement | null) => {
    if (el) cardElsRef.current.set(id, el);
    else cardElsRef.current.delete(id);
  };

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

    // small delay so refs are registered
    const timer = setTimeout(() => {
      cardElsRef.current.forEach((el) => observer.observe(el));
    }, 50);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  if (!tree) return null;

  return (
    <div>
      <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 text-center mb-3 tracking-tight">
        読書遍歴
      </h2>
      <p className="text-sm lg:text-base text-slate-500 text-center mb-12">
        芋づる式に広がってきた関心の軌跡
      </p>

      <JourneyCard
        node={tree}
        isRoot={true}
        expandedId={expandedId}
        setExpandedId={setExpandedId}
        visibleIds={visibleIds}
        registerRef={registerRef}
      />

      <p className="text-[11px] text-slate-400 text-center mt-8">
        ※ この読書遍歴は、読書記録データをもとに生成AIが作成したものです
      </p>
    </div>
  );
}
