"use client";

import { useState } from "react";
import EventCard from "./EventCard";

type EventItem = {
  id: string;
  source: string;
  title: string;
  url: string;
  startDate: string | null;
  venue: string | null;
  matchedAuthors: string[];
  status: "PENDING" | "INTERESTED" | "DISMISSED";
};

type Tab = "PENDING" | "INTERESTED";

type Props = {
  pending: EventItem[];
  interested: EventItem[];
};

export default function EventTabs({ pending, interested }: Props) {
  const [tab, setTab] = useState<Tab>("PENDING");

  const tabs: { key: Tab; label: string; count: number; activeClass: string; badgeActive: string }[] = [
    {
      key: "PENDING",
      label: "未判定",
      count: pending.length,
      activeClass: "border-blue-500 text-blue-600",
      badgeActive: "bg-blue-500 text-white",
    },
    {
      key: "INTERESTED",
      label: "興味あり",
      count: interested.length,
      activeClass: "border-amber-500 text-amber-600",
      badgeActive: "bg-amber-500 text-white",
    },
  ];

  const items = tab === "PENDING" ? pending : interested;

  return (
    <div>
      <div className="flex gap-0 mb-4 border-b border-slate-200">
        {tabs.map(({ key, label, count, activeClass, badgeActive }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={[
              "pb-2.5 px-3 text-sm font-medium border-b-2 transition-colors -mb-px",
              tab === key
                ? activeClass
                : "border-transparent text-slate-400 hover:text-slate-600",
            ].join(" ")}
          >
            {label}
            <span
              className={[
                "ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                tab === key ? badgeActive : "bg-slate-200 text-slate-500",
              ].join(" ")}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">
          {tab === "PENDING"
            ? "未判定のイベントはありません。「イベントを取得」を押してください。"
            : "興味ありのイベントはまだありません。"}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((ev) => (
            <EventCard key={ev.id} {...ev} />
          ))}
        </div>
      )}
    </div>
  );
}
