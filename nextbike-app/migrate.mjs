import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL);
const db = drizzle(sql);

console.log("[migrate] Running migrations…");
await migrate(db, { migrationsFolder: "/app/drizzle" });
await sql.end();
console.log("[migrate] Done.");
