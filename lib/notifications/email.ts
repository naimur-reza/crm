import "server-only";

export async function sendEmailWithAttachment({
  to,
  subject,
  text,
  attachmentName,
  attachmentBytes,
}: {
  to: string;
  subject: string;
  text: string;
  attachmentName: string;
  attachmentBytes: Uint8Array;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("Email sending is not configured. Add RESEND_API_KEY and EMAIL_FROM to enable invoice email delivery.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
      attachments: [
        {
          filename: attachmentName,
          content: Buffer.from(attachmentBytes).toString("base64"),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Email provider failed: ${body}`);
  }
}
