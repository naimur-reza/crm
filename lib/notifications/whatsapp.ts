import "server-only";

export function normalizeWhatsAppNumber(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

export function buildWhatsAppLink(phone: string, message: string) {
  const normalized = normalizeWhatsAppNumber(phone);
  if (!normalized) {
    throw new Error("A WhatsApp phone number is required.");
  }

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function renderTemplate(
  template: string,
  values: Record<string, string | number | null | undefined>,
) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key: string) =>
    String(values[key] ?? ""),
  );
}
