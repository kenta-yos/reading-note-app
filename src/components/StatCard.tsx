"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "./Spinner";

type StatCardProps = {
  title: string;
  value: string | number;
  sub?: string;
  icon?: string;
  href?: string;
};

export default function StatCard({ title, value, sub, icon, href }: StatCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleTap = () => {
    if (!href || loading) return;
    setLoading(true);
    router.push(href);
  };

  const content = (
    <>
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <span className="text-base lg:text-xl">{icon}</span>}
        <p className="text-xs lg:text-sm text-slate-500 font-medium truncate">{title}</p>
      </div>
      <p className="text-xl lg:text-3xl font-bold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      {loading && (
        <div className="absolute inset-0 bg-white/60 rounded-xl flex items-center justify-center">
          <Spinner className="w-5 h-5 text-blue-500" />
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <button
        onClick={handleTap}
        className="relative text-left bg-white border border-slate-200 rounded-xl p-3 lg:p-5 shadow-sm active:scale-[0.98] transition-all hover:border-blue-200 hover:shadow-md"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="relative bg-white border border-slate-200 rounded-xl p-3 lg:p-5 shadow-sm">
      {content}
    </div>
  );
}
