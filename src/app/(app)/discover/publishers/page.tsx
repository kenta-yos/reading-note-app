export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import PublisherManager from "@/components/PublisherManager";
import Link from "next/link";

export default async function PublishersPage() {
  const publishers = await prisma.watchPublisher.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/discover"
          className="text-slate-400 hover:text-slate-600 transition-colors text-sm"
        >
          ← 新刊一覧
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-lg font-bold text-slate-800">監視出版社の管理</h1>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <p className="text-xs text-slate-500 mb-5 leading-relaxed">
          新刊チェック対象の学術出版社を管理します。追加・削除はすぐに反映されます。
        </p>
        <PublisherManager initialPublishers={publishers} />
      </div>
    </div>
  );
}
