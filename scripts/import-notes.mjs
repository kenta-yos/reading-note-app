import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: new URL("../.env", import.meta.url).pathname });

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ",") { row.push(field); field = ""; }
      else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (ch !== "\r") { field += ch; }
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const raw = readFileSync("/Users/yoshiikenta/Downloads/books.csv", "utf-8");
  const text = raw.startsWith("\uFEFF") ? raw.slice(1) : raw;
  const rows = parseCSV(text);

  const withNotes = rows
    .map(row => ({ title: (row[0] || "").trim(), note: (row[8] || "").trim() }))
    .filter(r => r.note && r.title);

  console.log(`\n対象件数: ${withNotes.length} 件\n`);

  const allBooks = await prisma.book.findMany({ select: { id: true, title: true, notes: true } });
  const bookMap = new Map(allBooks.map(b => [b.title.trim(), b]));

  const updated = [];
  const notFound = [];
  const skipped = [];

  for (const { title, note } of withNotes) {
    const book = bookMap.get(title);
    if (!book) { notFound.push(title); continue; }
    if (book.notes && book.notes.trim()) { skipped.push({ title, existing: book.notes.slice(0, 40) }); continue; }
    await prisma.book.update({ where: { id: book.id }, data: { notes: note } });
    updated.push(title);
  }

  await prisma.$disconnect();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ 更新完了: ${updated.length} 件`);
  updated.forEach(t => console.log(`   ・${t}`));

  if (skipped.length) {
    console.log(`\n⚠️  既にメモあり（スキップ）: ${skipped.length} 件`);
    skipped.forEach(({ title, existing }) => console.log(`   ・${title}\n     既存: "${existing}..."`));
  }

  console.log(`\n❌ アプリに存在しない書籍: ${notFound.length} 件`);
  notFound.forEach(t => console.log(`   ・${t}`));
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main().catch(console.error);
