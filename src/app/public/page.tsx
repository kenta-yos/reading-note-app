import { prisma } from "@/lib/prisma";
import { getConceptGraph } from "@/lib/concepts";
import PublicHeader from "./components/PublicHeader";
import StatCards from "./components/StatCards";
import PublicPageClient from "./components/PublicPageClient";

export const revalidate = 3600; // ISR: 1 hour

export default async function PublicPage() {
  // Fetch all read books - explicitly exclude notes and rating
  const books = await prisma.book.findMany({
    where: { readAt: { not: null } },
    select: {
      title: true,
      author: true,
      category: true,
      readAt: true,
      pages: true,
    },
    orderBy: { readAt: "desc" },
  });

  // Concept graph data (all years)
  const graphData = await getConceptGraph();

  // Compute stats
  const totalBooks = books.length;
  const totalPages = books.reduce((sum, b) => sum + b.pages, 0);
  const readDates = books
    .map((b) => b.readAt!.getFullYear())
    .sort((a, b) => a - b);
  const minYear = readDates[0] ?? new Date().getFullYear();
  const maxYear = readDates[readDates.length - 1] ?? new Date().getFullYear();

  // Category counts
  const catCountMap = new Map<string, number>();
  for (const b of books) {
    const cat = b.category ?? "その他";
    catCountMap.set(cat, (catCountMap.get(cat) ?? 0) + 1);
  }
  const categoryData = [...catCountMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }));

  // Serializable book list for client
  const bookList = books.map((b) => ({
    title: b.title,
    author: b.author,
    category: b.category,
    readYear: b.readAt!.getFullYear(),
    pageCount: b.pages,
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 pb-16">
      <PublicHeader />

      <section className="mb-12">
        <StatCards
          totalBooks={totalBooks}
          minYear={minYear}
          maxYear={maxYear}
          totalPages={totalPages}
        />
      </section>

      <PublicPageClient
        categoryData={categoryData}
        graphData={graphData}
        bookList={bookList}
      />

      {/* Footer CTA */}
      <footer className="text-center py-12 border-t border-slate-200 mt-12">
        <p className="text-sm text-slate-500 mb-4">
          読書記録は ScholarGraph で管理しています
        </p>
        <a
          href="https://my-reading-assistant.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-medium transition-all hover:opacity-85 shadow-md"
          style={{ backgroundColor: "#1a5276" }}
        >
          Lukaで読書準備する
        </a>
      </footer>
    </div>
  );
}
