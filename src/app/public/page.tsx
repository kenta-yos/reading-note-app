import { prisma } from "@/lib/prisma";
import { getConceptGraph } from "@/lib/concepts";
import PublicHeader from "./components/PublicHeader";
import About from "./components/About";
import ReadingJourney from "./components/ReadingJourney";
import PublicPageClient from "./components/PublicPageClient";

export const revalidate = 300;

export default async function PublicPage() {
  const books = await prisma.book.findMany({
    where: { readAt: { not: null } },
    select: {
      title: true,
      author: true,
      category: true,
      discipline: true,
      readAt: true,
      pages: true,
    },
    orderBy: { readAt: "desc" },
  });

  const graphData = await getConceptGraph();

  const totalBooks = books.length;
  const totalPages = books.reduce((sum, b) => sum + (b.pages ?? 0), 0);
  const readDates = books
    .map((b) => b.readAt!.getFullYear())
    .sort((a, b) => a - b);
  const minYear = readDates[0] ?? new Date().getFullYear();

  const bookList = books.map((b) => ({
    title: b.title,
    author: b.author,
    category: b.category,
    discipline: b.discipline,
    readYear: b.readAt!.getFullYear(),
    pageCount: b.pages,
  }));

  return (
    <div>
      {/* Hero: header + stats */}
      <PublicHeader
        totalBooks={totalBooks}
        totalPages={totalPages}
        minYear={minYear}
      />

      {/* About */}
      <About />

      {/* Reading Journey */}
      <section className="pt-10 lg:pt-12 pb-16 lg:pb-20">
        <div className="max-w-4xl mx-auto px-4">
          <ReadingJourney />
        </div>
      </section>

      {/* Concept Network */}
      <section className="py-16 lg:py-20" style={{ backgroundColor: "rgba(26,82,118,0.03)" }}>
        <div className="max-w-5xl mx-auto px-4">
          <PublicPageClient graphData={graphData} bookList={bookList} />
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-10">
        <p className="text-xs text-slate-400">
          読書記録は ScholarGraph で管理しています
        </p>
      </footer>
    </div>
  );
}
