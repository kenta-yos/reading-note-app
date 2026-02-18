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
        pages: book.pages,
        category: book.category ?? "",
        tags: book.tags,
        rating: book.rating ?? undefined,
        notes: book.notes ?? "",
        readAt: book.readAt ? book.readAt.toISOString() : undefined,
      }}
    />
  );
}
