"use client";

import { useState } from "react";
import type { ConceptGraphData } from "@/lib/concepts";
import CategoryChart from "./CategoryChart";
import ConceptNetwork from "./ConceptNetwork";
import BookList from "./BookList";

type CategoryData = { category: string; count: number };
type PublicBook = {
  title: string;
  author: string | null;
  category: string | null;
  readYear: number;
  pageCount: number;
};

type Props = {
  categoryData: CategoryData[];
  graphData: ConceptGraphData;
  bookList: PublicBook[];
};

export default function PublicPageClient({
  categoryData,
  graphData,
  bookList,
}: Props) {
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  return (
    <>
      {/* Category Chart */}
      <section className="mb-12">
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
