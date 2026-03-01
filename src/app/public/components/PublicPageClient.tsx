"use client";

import { useState } from "react";
import type { ConceptGraphData } from "@/lib/concepts";
import DisciplineChart from "./CategoryChart";
import ConceptNetwork from "./ConceptNetwork";
import BookList from "./BookList";

type DisciplineData = { discipline: string; count: number };
type PublicBook = {
  title: string;
  author: string | null;
  category: string | null;
  discipline: string | null;
  readYear: number;
  pageCount: number;
};

type Props = {
  disciplineData: DisciplineData[];
  graphData: ConceptGraphData;
  bookList: PublicBook[];
};

export default function PublicPageClient({
  disciplineData,
  graphData,
  bookList,
}: Props) {
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterDiscipline, setFilterDiscipline] = useState<string | null>(null);

  return (
    <>
      {/* Discipline Chart */}
      <section className="mb-12">
        <DisciplineChart
          data={disciplineData}
          selectedDiscipline={filterDiscipline}
          onDisciplineClick={setFilterDiscipline}
        />
      </section>

      {/* Concept Network */}
      <section className="mb-12">
        <ConceptNetwork data={graphData} />
      </section>

      {/* Book List */}
      <section id="book-list">
        <BookList
          books={bookList}
          filterYear={filterYear}
          filterDiscipline={filterDiscipline}
          onYearChange={setFilterYear}
          onDisciplineChange={setFilterDiscipline}
        />
      </section>
    </>
  );
}
