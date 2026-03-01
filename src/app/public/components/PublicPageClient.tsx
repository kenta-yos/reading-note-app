"use client";

import { useState } from "react";
import type { ConceptGraphData } from "@/lib/concepts";
import YearlyChart from "./YearlyChart";
import CategoryChart from "./CategoryChart";
import ConceptNetwork from "./ConceptNetwork";
import BookList from "./BookList";

type YearlyData = { year: number; count: number };
type CategoryData = { category: string; count: number };
type PublicBook = {
  title: string;
  author: string | null;
  category: string | null;
  readYear: number;
  pageCount: number;
};

type Props = {
  yearlyData: YearlyData[];
  categoryData: CategoryData[];
  graphData: ConceptGraphData;
  bookList: PublicBook[];
};

export default function PublicPageClient({
  yearlyData,
  categoryData,
  graphData,
  bookList,
}: Props) {
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  return (
    <>
      {/* Charts grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
        <YearlyChart
          data={yearlyData}
          selectedYear={filterYear}
          onYearClick={setFilterYear}
        />
        <CategoryChart
          data={categoryData}
          selectedCategory={filterCategory}
          onCategoryClick={setFilterCategory}
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
          filterCategory={filterCategory}
          onYearChange={setFilterYear}
          onCategoryChange={setFilterCategory}
        />
      </section>
    </>
  );
}
