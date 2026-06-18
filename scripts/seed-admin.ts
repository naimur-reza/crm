import "dotenv/config";
import { hash } from "@node-rs/argon2";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/lib/db/schema";
import { roles, users, userRoles } from "@/lib/db/schema";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  const passwordHash = await hash(process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!", {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const roleSeed = [
    ["admin", "Admin", "Full access to the application."],
    ["hr", "HR", "Employee, attendance, and user operations."],
    ["manager", "Manager", "Team, task, and client oversight."],
    ["employee", "Employee", "Own attendance and assigned work."],
    ["sales", "Sales", "Client and sales task operations."],
  ] as const;

  for (const [name, label, description] of roleSeed) {
    await db
      .insert(roles)
      .values({ name, label, description })
      .onConflictDoUpdate({ target: roles.name, set: { label, description } });
  }

  const roleRows = await db.select({ id: roles.id, name: roles.name }).from(roles);
  const roleId = (name: string) => {
    const r = roleRows.find((row) => row.name === name);
    if (!r) throw new Error(`Missing role: ${name}`);
    return r.id;
  };

  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@company.test";
  const name = process.env.SEED_ADMIN_NAME ?? "System Admin";

  const [user] = await db
    .insert(users)
    .values({ email, name, passwordHash, status: "active" })
    .onConflictDoUpdate({ target: users.email, set: { name, status: "active", updatedAt: new Date() } })
    .returning({ id: users.id });

  await db
    .insert(userRoles)
    .values({ userId: user.id, roleId: roleId("admin") })
    .onConflictDoNothing();

  console.log(`Admin seeded: ${email} / ${name}`);
  await pool.end();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
