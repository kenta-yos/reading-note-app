import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
config({ path: new URL("../.env", import.meta.url).pathname });

import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const API_ERROR_SENTINEL = "__api_error__";

const pending = await prisma.book.findMany({
  where: {
    readAt: { not: null },
    NOT: { keywords: { some: { keyword: { not: API_ERROR_SENTINEL } } } },
  },
  select: {
    id: true,
    title: true,
    notes: true,
    keywords: { select: { keyword: true, count: true } },
  },
});

console.log(`未処理冊数: ${pending.length}`);
for (const b of pending) {
  console.log(`\n書籍ID: ${b.id}`);
  console.log(`タイトル: ${b.title}`);
  console.log(`感想あり: ${b.notes ? "Yes (" + b.notes.slice(0, 50) + "...)" : "No"}`);
  console.log(`キーワード: ${JSON.stringify(b.keywords)}`);
}

await prisma.$disconnect();
await pool.end();
