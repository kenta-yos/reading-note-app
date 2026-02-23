import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { fileURLToPath } from "url";
config({ path: new URL("../.env", import.meta.url).pathname });

import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const count = await prisma.bookKeyword.count();
console.log("BookKeyword総数:", count);

const books = await prisma.bookKeyword.groupBy({ by: ["bookId"] });
console.log("書籍数（概念あり）:", books.length);

await prisma.$disconnect();
await pool.end();
