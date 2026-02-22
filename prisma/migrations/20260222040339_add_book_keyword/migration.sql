-- CreateTable
CREATE TABLE "BookKeyword" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "BookKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookKeyword_keyword_idx" ON "BookKeyword"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "BookKeyword_bookId_keyword_key" ON "BookKeyword"("bookId", "keyword");

-- AddForeignKey
ALTER TABLE "BookKeyword" ADD CONSTRAINT "BookKeyword_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
