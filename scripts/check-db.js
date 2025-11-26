import pg from "pg";
import fs from "fs";
import path from "path";

const url = process.env.DATABASE_URL;

if (!url) {
  console.log("DATABASE_URL не задан — пропускаю db:push, используем память.");
  process.exit(0);
}

const { Client } = pg;

(async () => {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    const res = await client.query("select to_regclass('public.spells') as reg");
    if (res.rows[0]?.reg) {
      console.log("База уже развёрнута — пропускаю миграции.");
    } else {
      console.log("База не развёрнута — применяю миграции из /app/migrations.");
      const dir = path.resolve(import.meta.dirname, "..", "migrations");
      const files = fs.readdirSync(dir)
        .filter((f) => f.endsWith(".sql"))
        .sort();
      await client.query("BEGIN");
      for (const f of files) {
        const sql = fs.readFileSync(path.join(dir, f), "utf-8");
        await client.query(sql);
      }
      await client.query("COMMIT");
      console.log("Миграции применены.");
    }
  } catch (e) {
    console.error("Проверка/миграция БД не удалась:", e.message);
    process.exit(1);
  } finally {
    try { await client.end(); } catch {}
  }
process.exit(0);
})();