import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: new URL("../.env", import.meta.url).pathname });

// --- CSV パース ---
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') { if (text[i+1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(field); field = ""; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ""; }
      else if (ch !== '\r') field += ch;
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// --- 正規化 ---
function normalize(s) {
  const { default: unicodedata } = { default: null }; // use manual approach
  s = s.normalize('NFKC');
  s = s.replace(/[「」『』【】()（）｢｣\[\]《》〈〉\s・ー―　]/g, '');
  return s.toLowerCase();
}

// --- 類似度 ---
function sim(a, b) {
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;
  const editDist = (s1, s2) => {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastVal = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) costs[j] = j;
        else if (j > 0) {
          let newVal = costs[j - 1];
          if (s1[i-1] !== s2[j-1]) newVal = Math.min(Math.min(newVal, lastVal), costs[j]) + 1;
          costs[j - 1] = lastVal;
          lastVal = newVal;
        }
      }
      if (i > 0) costs[s2.length] = lastVal;
    }
    return costs[s2.length];
  };
  return (longer.length - editDist(longer, shorter)) / longer.length;
}

// 除外するCSVタイトル（44件の中の#33）
const EXCLUDE = new Set([
  'フェミニズムってなんですか？',
]);

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const raw = readFileSync("/Users/yoshiikenta/Downloads/books.csv", "utf-8");
  const text = raw.startsWith("\uFEFF") ? raw.slice(1) : raw;
  const rows = parseCSV(text);

  // I列に値があるもの
  const csvWithNotes = rows
    .map(r => ({ title: (r[0]||'').trim(), note: (r[8]||'').trim() }))
    .filter(r => r.note && r.title);

  // DB全書籍
  const allBooks = await prisma.book.findMany({ select: { id: true, title: true, notes: true } });
  const dbExact = new Map(allBooks.map(b => [b.title.trim(), b]));

  // 完全一致で既に処理済みのものを除外 → 未マッチの147件を再現
  const unmatched = csvWithNotes.filter(r => !dbExact.has(r.title));

  // DB正規化リスト
  const dbNorm = allBooks.map(b => ({
    norm: normalize(b.title),
    book: b,
  }));

  // ファジーマッチ
  function bestMatch(csvTitle) {
    const normCsv = normalize(csvTitle);
    let best = null, bestScore = 0;
    for (const { norm, book } of dbNorm) {
      let score = sim(normCsv, norm);
      if (normCsv.includes(norm) || norm.includes(normCsv)) score = Math.max(score, 0.70);
      if (score > bestScore) { bestScore = score; best = book; }
    }
    return { book: best, score: bestScore };
  }

  const toUpdate = []; // { csvTitle, dbBook, score, note }

  for (const { title, note } of unmatched) {
    if (EXCLUDE.has(title)) continue;
    const { book, score } = bestMatch(title);
    if (score >= 0.65) { // 65%以上 = 32件 + 44件（除外1件）
      toUpdate.push({ csvTitle: title, dbBook: book, score, note });
    }
  }

  console.log(`\n対象: ${toUpdate.length} 件を処理します\n`);

  let updated = 0, skipped = 0;
  for (const { csvTitle, dbBook, score, note } of toUpdate) {
    if (dbBook.notes && dbBook.notes.trim()) {
      console.log(`⚠️  スキップ（既にメモあり）: ${dbBook.title}`);
      skipped++;
      continue;
    }
    await prisma.book.update({ where: { id: dbBook.id }, data: { notes: note } });
    console.log(`✅ [${Math.round(score*100)}%] ${csvTitle}`);
    console.log(`          → ${dbBook.title}`);
    updated++;
  }

  await prisma.$disconnect();

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ 更新完了: ${updated} 件`);
  console.log(`⚠️  スキップ（既にメモあり）: ${skipped} 件`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main().catch(console.error);
