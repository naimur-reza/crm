import "server-only";

import { createHash, randomBytes } from "crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { roles, sessions, userRoles, users } from "@/lib/db/schema";
import { sessionCookieName } from "@/lib/auth/constants";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  roles: string[];
};

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const headerList = await headers();

  await getDb().insert(sessions).values({
    userId,
    tokenHash: hashSessionToken(token),
    expiresAt,
    userAgent: headerList.get("user-agent"),
    ipAddress: headerList.get("x-forwarded-for")?.split(",")[0]?.trim(),
  });

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (token) {
    await getDb()
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.tokenHash, hashSessionToken(token)));
  }

  cookieStore.delete(sessionCookieName);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return null;
  }

  const rows = await getDb()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      role: roles.name,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(userRoles.roleId, roles.id))
    .where(
      and(
        eq(sessions.tokenHash, hashSessionToken(token)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
        eq(users.status, "active"),
      ),
    );

  if (rows.length === 0) {
    return null;
  }

  return {
    id: rows[0].id,
    name: rows[0].name,
    email: rows[0].email,
    avatarUrl: rows[0].avatarUrl,
    roles: rows.map((row) => row.role).filter((role): role is string => Boolean(role)),
  };
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
