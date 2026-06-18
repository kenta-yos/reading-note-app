-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "readNext" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Book_status_readNext_idx" ON "Book"("status", "readNext");
