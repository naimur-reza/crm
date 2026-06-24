import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const r = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_permissions'");
  console.log("Columns:", JSON.stringify(r.rows));
} catch (e) {
  console.error("Error:", e.message);
}
await pool.end();
