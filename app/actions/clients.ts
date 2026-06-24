"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { clientContacts, clientInteractions, clients } from "@/lib/db/schema";
import { logAudit } from "@/lib/db/queries/audit";
import { clientSchema, contactSchema, interactionSchema } from "@/lib/validation/clients";

const nullable = (value?: string) => (value ? value : null);

export async function createClient(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "clients");

  const parsed = clientSchema.parse({
    name: formData.get("name"),
    status: formData.get("status"),
    source: formData.get("source") || undefined,
    website: formData.get("website") || undefined,
    notes: formData.get("notes") || undefined,
    ownerEmployeeId: formData.get("ownerEmployeeId") || "",
  });

  const [client] = await getDb()
    .insert(clients)
    .values({
      ...parsed,
      ownerEmployeeId: nullable(parsed.ownerEmployeeId),
    })
    .returning({ id: clients.id });

  await logAudit(user.id, "client.created", "client", client.id);
  revalidatePath("/clients");
  revalidatePath("/crm/clients");
  revalidatePath(`/crm/clients/${client.id}`);
  revalidatePath("/dashboard");
}

export async function updateClient(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "clients");

  const clientId = String(formData.get("clientId"));
  if (!clientId) throw new Error("Client id is required.");

  const parsed = clientSchema.parse({
    name: formData.get("name"),
    status: formData.get("status"),
    source: formData.get("source") || undefined,
    website: formData.get("website") || undefined,
    notes: formData.get("notes") || undefined,
    ownerEmployeeId: formData.get("ownerEmployeeId") || "",
  });

  await getDb()
    .update(clients)
    .set({
      ...parsed,
      ownerEmployeeId: nullable(parsed.ownerEmployeeId),
      updatedAt: new Date(),
    })
    .where(eq(clients.id, clientId));
  await logAudit(user.id, "client.updated", "client", clientId);
  revalidatePath("/clients");
  revalidatePath("/crm");
  revalidatePath("/crm/clients");
  revalidatePath(`/crm/clients/${clientId}`);
  revalidatePath("/dashboard");
}

export async function addClientContact(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "clients");

  const parsed = contactSchema.parse({
    clientId: formData.get("clientId"),
    name: formData.get("name"),
    title: formData.get("title") || undefined,
    email: formData.get("email") || "",
    phone: formData.get("phone") || undefined,
  });

  await getDb().insert(clientContacts).values({
    ...parsed,
    email: parsed.email || null,
  });
  await logAudit(user.id, "client.contact_added", "client", parsed.clientId);
  revalidatePath("/clients");
  revalidatePath("/crm/clients");
  revalidatePath(`/crm/clients/${parsed.clientId}`);
}

export async function addClientInteraction(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "clients");

  const parsed = interactionSchema.parse({
    clientId: formData.get("clientId"),
    type: formData.get("type"),
    summary: formData.get("summary"),
  });

  await getDb().insert(clientInteractions).values({ ...parsed, userId: user.id });
  await logAudit(user.id, "client.interaction_added", "client", parsed.clientId);
  revalidatePath("/clients");
  revalidatePath("/crm/clients");
  revalidatePath(`/crm/clients/${parsed.clientId}`);
}

export async function deleteClient(formData: FormData) {
  const user = await requireUser();
  requirePermission(user, "clients");

  const clientId = String(formData.get("id"));
  if (!clientId) throw new Error("Client id is required.");

  await getDb().delete(clients).where(eq(clients.id, clientId));
  await logAudit(user.id, "client.deleted", "client", clientId);
  revalidatePath("/clients");
  revalidatePath("/crm");
  revalidatePath("/crm/clients");
  revalidatePath("/dashboard");
}
