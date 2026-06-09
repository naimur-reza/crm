"use client";

import { useState, useTransition } from "react";
import { Download, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { createInvoiceWhatsAppLink, sendInvoiceEmail } from "@/app/actions/crm";
import { ModalForm } from "@/components/modal-form";
import { ActionButton } from "@/components/ui/action-button";
import { Field, TextArea } from "@/components/ui/field";

export function InvoiceShareActions({
  invoiceId,
  defaultName,
  defaultEmail,
  defaultPhone,
}: {
  invoiceId: string;
  defaultName?: string | null;
  defaultEmail?: string | null;
  defaultPhone?: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <ModalForm
        title="Email invoice"
        description="Send this invoice as a PDF attachment to the client."
        triggerLabel="Email invoice"
        triggerIcon={<Mail className="h-4 w-4" />}
        triggerClassName="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#3995d2] px-4 text-sm font-semibold text-white transition hover:bg-[#2f80bd]"
        action={sendInvoiceEmail}
        submitLabel="Send email"
        formClassName="grid gap-x-6 gap-y-5 md:grid-cols-2"
      >
        <input type="hidden" name="invoiceId" value={invoiceId} />
        <Field label="Recipient name" name="recipientName" defaultValue={defaultName ?? ""} />
        <Field label="Recipient email" name="recipientEmail" type="email" defaultValue={defaultEmail ?? ""} required />
        <div className="md:col-span-2">
          <TextArea
            label="Message"
            name="message"
            defaultValue="Please find your invoice attached as a PDF."
          />
        </div>
      </ModalForm>

      <ModalForm
        title="WhatsApp invoice"
        description="Generate a WhatsApp message with an invoice preview link."
        triggerLabel="WhatsApp invoice"
        triggerIcon={<MessageCircle className="h-4 w-4" />}
        triggerClassName="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-[#3995d2] hover:text-[#3995d2]"
      >
        <form
          className="grid gap-x-6 gap-y-5 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              try {
                const result = await createInvoiceWhatsAppLink(formData);
                toast.success("WhatsApp invoice link generated.");
                window.open(result.waLink, "_blank", "noopener,noreferrer");
              } catch (caught) {
                const message = caught instanceof Error ? caught.message : "Something went wrong.";
                setError(message);
                toast.error(message);
              }
            });
          }}
        >
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <Field label="Recipient name" name="recipientName" defaultValue={defaultName ?? ""} />
          <Field label="WhatsApp number" name="recipientPhone" defaultValue={defaultPhone ?? ""} required />
          <div className="md:col-span-2">
            <TextArea
              label="Message"
              name="message"
              defaultValue="Please review your invoice using the link below."
            />
          </div>
          {error ? (
            <p className="md:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <div className="md:col-span-2 flex justify-end">
            <ActionButton pendingLabel="Generating..." variant="primary">
              <MessageCircle className="h-4 w-4" />
              Generate link
            </ActionButton>
          </div>
        </form>
      </ModalForm>

      <a
        href={`/api/crm/invoices/${invoiceId}/pdf`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-[#3995d2] hover:text-[#3995d2]"
      >
        <Download className="h-4 w-4" />
        Download PDF
      </a>
      {pending ? <span className="sr-only">Generating WhatsApp link</span> : null}
    </>
  );
}
