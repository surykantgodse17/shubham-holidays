import { readdir, readFile } from "node:fs/promises";
import pg from "pg";

const url = process.env.DATABASE_URL?.trim() ?? "";
const files = (await readdir("migrations").catch(() => []))
  .filter((f) => f.endsWith(".sql"))
  .sort();
if (url === "" || files.length === 0) {
  console.log("migrate: nothing to do");
  process.exit(0);
}
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL_UNPOOLED?.trim() || url,
  connectionTimeoutMillis: 20_000,
});
await client.connect();
let locked = false;
try {
  await client.query("set lock_timeout = '15s'");
  const got = await client.query("select pg_try_advisory_lock(7272741) as ok");
  locked = Boolean(got.rows[0]?.ok);
  if (!locked) {
    console.log("migrate: skipped (another migrate holds the lock)");
    process.exit(0);
  }
  await client.query(
    "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const done = new Set(
    (await client.query("select name from schema_migrations")).rows.map((r) => r.name),
  );
  for (const file of files.filter((f) => !done.has(f))) {
    await client.query("begin");
    try {
      await client.query(await readFile(`migrations/${file}`, "utf8"));
      await client.query("insert into schema_migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log(`migrate: applied ${file}`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }
  if (files.every((f) => done.has(f))) {
    console.log("migrate: already up to date");
  }
} finally {
  if (locked) {
    await client.query("select pg_advisory_unlock(7272741)").catch(() => {});
  }
  await client.end().catch(() => {});
}
