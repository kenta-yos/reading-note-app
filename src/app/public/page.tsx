import { prisma } from "@/lib/prisma";
import { getConceptGraph } from "@/lib/concepts";
import PublicHeader from "./components/PublicHeader";
import SectionNav from "./components/SectionNav";
import About from "./components/About";
import Activities from "./components/Activities";
import SectionHeading from "./components/SectionHeading";
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

      <SectionNav />

      {/* About */}
      <section id="about" className="pt-4 pb-8 lg:pt-5 lg:pb-10">
        <div className="max-w-2xl mx-auto px-4">
          <SectionHeading title="About" />
          <About />
        </div>
      </section>

      {/* Activities */}
      <section id="activities" className="py-14 lg:py-16" style={{ backgroundColor: "rgba(26,82,118,0.02)" }}>
        <div className="max-w-2xl mx-auto px-4">
          <SectionHeading title="やっていること" />
          <Activities />
        </div>
      </section>

      {/* Reading Journey */}
      <section id="journey" className="py-14 lg:py-16">
        <div className="max-w-4xl mx-auto px-4">
          <ReadingJourney />
        </div>
      </section>

      {/* Concept Network + Book List */}
      <section id="concepts" className="py-14 lg:py-16" style={{ backgroundColor: "rgba(26,82,118,0.02)" }}>
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
