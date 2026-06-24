"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getAiClient, getAiModel } from "@/lib/ai/client";
import { attendancePredictionPrompt } from "@/lib/ai/prompts";
import {
  getAttendancePredictionData,
  upsertAttendancePrediction,
  getAttendancePrediction,
} from "@/lib/db/queries/ai/attendance-predictions";
import { getDb } from "@/lib/db";
import { employees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday",
];

export async function predictAttendance(employeeId: string, date: string) {
  const user = await requireUser();
  requirePermission(user, "ai");

  const data = await getAttendancePredictionData(employeeId);
  if (!data) throw new Error("Employee not found");

  const dateObj = new Date(date);
  const dayOfWeek = DAY_NAMES[dateObj.getDay()];

  const promptData = { ...data, dayOfWeek };

  const client = getAiClient();
  const response = await client.chat.completions.create({
    model: getAiModel(),
    messages: [
      {
        role: "system",
        content:
          "You are an attendance prediction AI. Always respond with valid JSON only.",
      },
      { role: "user", content: attendancePredictionPrompt(promptData) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const result = JSON.parse(response.choices[0]?.message?.content ?? "{}");

  await upsertAttendancePrediction(employeeId, {
    predictedDate: date,
    predictedStatus: result.predictedStatus ?? "present",
    confidence: Math.round((result.confidence ?? 0.5) * 100),
    reasoning: result.reasoning ?? "",
    riskFactors: result.riskFactors ?? [],
  });

  revalidatePath("/attendance");
  revalidatePath(`/employees/${employeeId}`);
  return result;
}

export async function getAttendancePredictionAction(employeeId: string, date: string) {
  const user = await requireUser();
  requirePermission(user, "ai");
  return getAttendancePrediction(employeeId, date);
}

export async function predictAllEmployeeAttendance(date: string) {
  const user = await requireUser();
  requirePermission(user, "ai");

  const allEmployees = await getDb()
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.status, "active"));

  const results = [];
  for (const emp of allEmployees) {
    try {
      const result = await predictAttendance(emp.id, date);
      results.push({ employeeId: emp.id, ...result });
    } catch {
      // skip failed predictions
    }
  }

  revalidatePath("/attendance");
  revalidatePath("/attendance/reports");
  return results;
}
