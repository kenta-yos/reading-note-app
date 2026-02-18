/**
 * 既存の title フィールド「著者名『書籍タイトル』（出版社、出版年）」を
 * author / title / publisher / publishedYear に分割して更新する
 */
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function parseTitle(raw) {
  // 著者名『書籍タイトル』（出版社、出版年）
  const titleMatch = raw.match(/『(.+?)』/);
  const parenMatch = raw.match(/（(.+?)）/);
  const authorMatch = raw.match(/^(.+?)『/);

  const title = titleMatch ? titleMatch[1] : raw;
  const author = authorMatch ? authorMatch[1].trim() : null;

  let publisher = null;
  let publishedYear = null;

  if (parenMatch) {
    const inner = parenMatch[1]; // 例: "中央公論新社、2021年"
    const parts = inner.split(/[、,]/);
    // 年が含まれるパーツを探す
    for (const part of parts) {
      const yearMatch = part.match(/(\d{4})/);
      if (yearMatch) {
        publishedYear = parseInt(yearMatch[1]);
      } else {
        publisher = part.trim();
      }
    }
    // publisherが見つからなかった場合、年以外の最初のパーツを使う
    if (!publisher && parts.length > 0) {
      publisher = parts[0].replace(/\d{4}年?/, "").trim() || null;
    }
  }

  return { title, author, publisher, publishedYear };
}

const client = await pool.connect();
try {
  const { rows } = await client.query(
    "SELECT id, title, author FROM \"Book\" WHERE author IS NULL OR author = ''"
  );

  console.log(`対象: ${rows.length} 件`);

  for (const row of rows) {
    const parsed = parseTitle(row.title);
    console.log(`\n[${row.id}]`);
    console.log(`  元: ${row.title}`);
    console.log(`  著者: ${parsed.author}`);
    console.log(`  タイトル: ${parsed.title}`);
    console.log(`  出版社: ${parsed.publisher}`);
    console.log(`  出版年: ${parsed.publishedYear}`);

    await client.query(
      `UPDATE "Book" SET title=$1, author=$2, publisher=$3, "publishedYear"=$4 WHERE id=$5`,
      [parsed.title, parsed.author, parsed.publisher, parsed.publishedYear, row.id]
    );
  }

  console.log("\n✓ 移行完了");
} finally {
  client.release();
  await pool.end();
}
