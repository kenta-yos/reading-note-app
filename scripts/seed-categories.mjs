/**
 * Book.category の全 distinct 値を Category テーブルに登録する
 */
import pg from "pg";
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

try {
  const { rows } = await client.query(`
    SELECT DISTINCT category FROM "Book"
    WHERE category IS NOT NULL AND category != ''
    ORDER BY category
  `);

  console.log(`登録するカテゴリ: ${rows.length} 件`);

  for (const { category } of rows) {
    await client.query(
      `INSERT INTO "Category" (id, name, "createdAt")
       VALUES (gen_random_uuid()::text, $1, NOW())
       ON CONFLICT (name) DO NOTHING`,
      [category]
    );
    console.log(`  ✓ ${category}`);
  }

  console.log("\n完了");
} finally {
  client.release();
  await pool.end();
}
