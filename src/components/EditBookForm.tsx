"use client";

import BookForm from "./BookForm";
import type { Book } from "@/lib/types";

type Props = {
  book: Book;
};

export default function EditBookForm({ book }: Props) {
  return (
    <BookForm
      mode="edit"
      initialData={{
        id: book.id,
        title: book.title,
        author: book.author ?? "",
        publisher: book.publisher ?? "",
        publishedYear: book.publishedYear ?? undefined,
        pages: book.pages,
        category: book.category ?? "",
        rating: book.rating ?? undefined,
        notes: book.notes ?? "",
        readAt: book.readAt ? book.readAt.toISOString() : undefined,
      }}
    />
  );
}
