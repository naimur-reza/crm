import "dotenv/config";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const tables = [
  "attendance_records",
  "payment_records",
  "invoice_items",
  "invoices",
  "lead_activities",
  "lead_contacts",
  "leads",
  "client_interactions",
  "client_contacts",
  "clients",
  "tasks",
  "employees",
  "departments",
  "notification_logs",
  "notification_templates",
  "chat_message_reads",
  "chat_messages",
  "chat_group_members",
  "chat_groups",
  "user_roles",
  "users",
  "roles",
  "crm_stages",
  "crm_pipelines",
  "site_settings",
];

async function main() {
  console.log("Truncating all tables...");
  for (const table of tables) {
    await db.execute(sql`TRUNCATE TABLE ${sql.identifier(table)} CASCADE`);
  }
  await db.execute(sql`TRUNCATE TABLE ${sql.identifier("__drizzle_migrations")}`);
  console.log("Done. All tables cleared.");
  await pool.end();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
