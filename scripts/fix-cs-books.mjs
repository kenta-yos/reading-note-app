import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
config({ path: new URL("../.env", import.meta.url).pathname });
import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// __api_error__ のままスタックしている本を __no_concepts__ に直す
const stuck = await prisma.book.findMany({
  where: {
    readAt: { not: null },
    keywords: { some: { keyword: "__api_error__" } },
    NOT: { keywords: { some: { keyword: { notIn: ["__api_error__"] } } } },
  },
  select: { id: true, title: true },
});

console.log(`スタック中: ${stuck.length}冊`);
for (const book of stuck) {
  console.log(`  処理: ${book.title}`);
  await prisma.bookKeyword.deleteMany({ where: { bookId: book.id, keyword: "__api_error__" } });
  await prisma.bookKeyword.upsert({
    where: { bookId_keyword: { bookId: book.id, keyword: "__no_concepts__" } },
    create: { bookId: book.id, keyword: "__no_concepts__", count: 0 },
    update: { count: 0 },
  });
}
console.log("完了");
await prisma.$disconnect();
await pool.end();
