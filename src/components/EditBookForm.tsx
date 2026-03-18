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
        isbn: book.isbn ?? "",
        pages: book.pages ?? undefined,
        discipline: book.discipline ?? "",
        rating: book.rating ?? undefined,
        description: book.description ?? "",
        notes: book.notes ?? "",
        status: book.status,
        readAt: book.readAt ? book.readAt.toISOString() : undefined,
      }}
    />
  );
}
