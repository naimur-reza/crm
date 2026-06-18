import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log("Applying migration 0009...");

    await client.query(`
      ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'user';
    `);
    console.log("  ✓ chat_messages.type column added");

    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_message_reads (
        message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        read_at timestamp with time zone NOT NULL DEFAULT now(),
        PRIMARY KEY (message_id, user_id)
      );
    `);
    console.log("  ✓ chat_message_reads table created");

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type text NOT NULL,
        title text NOT NULL,
        body text NOT NULL,
        group_id uuid REFERENCES chat_groups(id) ON DELETE CASCADE,
        actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        read_at timestamp with time zone,
        created_at timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    console.log("  ✓ notifications table created");

    await client.query(`
      CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications(user_id, read_at);
    `);
    console.log("  ✓ indexes created");

    console.log("Migration 0009 complete.");
  } finally {
    client.release();
    await pool.end();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
