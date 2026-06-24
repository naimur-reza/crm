export function leadScoringPrompt(data: {
  title: string;
  companyName: string | null;
  source: string | null;
  valueCents: number;
  stageName: string;
  stageProbability: number;
  activitySummaries: string[];
  daysSinceCreated: number;
  daysInCurrentStage: number | null;
}) {
  return `You are a sales lead scoring assistant. Analyze this lead and return a score.

Lead Information:
- Title: ${data.title}
- Company: ${data.companyName || "N/A"}
- Source: ${data.source || "N/A"}
- Value: $${(data.valueCents / 100).toFixed(2)}
- Current Stage: ${data.stageName} (probability: ${data.stageProbability}%)
- Days Since Created: ${data.daysSinceCreated}
- Days in Current Stage: ${data.daysInCurrentStage ?? "N/A"}
- Recent Activities: ${data.activitySummaries.join("; ") || "None"}

Return a JSON object with:
- score: number (0-100, where 100 is most likely to convert)
- label: "hot" | "warm" | "cold"
- reasoning: string (2-3 sentence explanation)

Respond with valid JSON only, no markdown.`;
}

export function sentimentPrompt(text: string) {
  return `Analyze the sentiment of the following interaction summary. Return a JSON object with:
- label: "positive" | "negative" | "neutral" | "mixed"
- score: number (-1.0 to 1.0, where -1 is most negative, 1 is most positive)
- keyPhrases: string[] (2-4 key phrases that indicate the sentiment)

Summary: "${text}"

Respond with valid JSON only, no markdown.`;
}

export function chatSummaryPrompt(messages: { sender: string; content: string }[]) {
  const formatted = messages
    .map((m) => `${m.sender}: ${m.content}`)
    .join("\n");

  return `Summarize the following chat conversation. Return a JSON object with:
- summary: string (2-3 paragraph concise summary)
- keyTopics: string[] (list of main topics discussed)
- actionItems: string[] (any action items or follow-ups mentioned)

Conversation:
${formatted}

Respond with valid JSON only, no markdown.`;
}

export function invoiceMatchingPrompt(data: {
  invoiceNumber: string;
  invoiceTotalCents: number;
  invoiceDueDate: string;
  invoiceItems: string[];
  clientName: string;
  payments: {
    amountCents: number;
    paymentDate: string;
    reference: string | null;
    notes: string | null;
  }[];
}) {
  const paymentsStr = data.payments
    .map(
      (p) =>
        `- Payment: $${(p.amountCents / 100).toFixed(2)} on ${p.paymentDate}, ref: ${p.reference || "N/A"}, notes: ${p.notes || "N/A"}`,
    )
    .join("\n");

  return `You are an invoice matching assistant. Analyze this invoice and its payments to determine which payments match.

Invoice: ${data.invoiceNumber}
Total: $${(data.invoiceTotalCents / 100).toFixed(2)}
Due Date: ${data.invoiceDueDate}
Client: ${data.clientName}
Items: ${data.invoiceItems.join(", ")}
Payments:
${paymentsStr || "No payments recorded"}

For each payment, determine if it matches this invoice. Consider amount, date proximity, and reference text.
Return a JSON array of matches:
[{
  "match": boolean,
  "confidence": number (0-1),
  "reasoning": string
}]

Respond with valid JSON only, no markdown.`;
}

export function attendancePredictionPrompt(data: {
  employeeName: string;
  department: string;
  attendanceHistory: { date: string; status: string }[];
  leaveHistory: { leaveType: string; startDate: string; endDate: string; status: string }[];
  dayOfWeek: string;
}) {
  const attendanceStr = data.attendanceHistory
    .map((a) => `- ${a.date}: ${a.status}`)
    .join("\n");
  const leaveStr = data.leaveHistory
    .map((l) => `- ${l.leaveType}: ${l.startDate} to ${l.endDate} (${l.status})`)
    .join("\n");

  return `You are an attendance prediction assistant. Analyze this employee's patterns and predict attendance.

Employee: ${data.employeeName}
Department: ${data.department}

Attendance History (last 6 months):
${attendanceStr || "No recent data"}

Leave History:
${leaveStr || "No leave history"}

Target day of week: ${data.dayOfWeek}

Return a JSON object with:
- predictedStatus: "present" | "late" | "absent" | "leave"
- confidence: number (0-1)
- reasoning: string (2-3 sentence explanation)
- riskFactors: string[] (factors contributing to this prediction)

Respond with valid JSON only, no markdown.`;
}
