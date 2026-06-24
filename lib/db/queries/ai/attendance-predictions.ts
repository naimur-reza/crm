import { eq, and, gte, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  attendancePredictions,
  attendanceRecords,
  leaveRequests,
  employees,
  departments,
} from "@/lib/db/schema";

export async function getAttendancePrediction(employeeId: string, date: string) {
  const [row] = await getDb()
    .select()
    .from(attendancePredictions)
    .where(
      and(
        eq(attendancePredictions.employeeId, employeeId),
        eq(attendancePredictions.predictedDate, date),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function upsertAttendancePrediction(
  employeeId: string,
  data: {
    predictedDate: string;
    predictedStatus: "present" | "late" | "absent" | "leave";
    confidence: number;
    reasoning: string;
    riskFactors: string[];
  },
) {
  const existing = await getAttendancePrediction(employeeId, data.predictedDate);
  if (existing) {
    await getDb()
      .update(attendancePredictions)
      .set({
        predictedStatus: data.predictedStatus,
        confidence: data.confidence,
        reasoning: data.reasoning,
        riskFactors: data.riskFactors,
        generatedAt: new Date(),
      })
      .where(eq(attendancePredictions.id, existing.id));
  } else {
    await getDb().insert(attendancePredictions).values({ employeeId, ...data });
  }
}

export async function getAttendancePredictionData(employeeId: string) {
  const db = getDb();

  const [employee] = await db
    .select({
      fullName: employees.fullName,
      departmentName: departments.name,
    })
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .where(eq(employees.id, employeeId))
    .limit(1);

  if (!employee) return null;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const attendanceHistory = await db
    .select({
      date: attendanceRecords.attendanceDate,
      status: attendanceRecords.status,
    })
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.employeeId, employeeId),
        gte(attendanceRecords.attendanceDate, sixMonthsAgo.toISOString().split("T")[0]),
      ),
    )
    .orderBy(desc(attendanceRecords.attendanceDate));

  const leaveHistory = await db
    .select({
      leaveType: leaveRequests.leaveType,
      startDate: leaveRequests.startDate,
      endDate: leaveRequests.endDate,
      status: leaveRequests.status,
    })
    .from(leaveRequests)
    .where(
      and(
        eq(leaveRequests.employeeId, employeeId),
        gte(leaveRequests.createdAt, sixMonthsAgo),
      ),
    )
    .orderBy(desc(leaveRequests.createdAt));

  return {
    employeeName: employee.fullName,
    department: employee.departmentName ?? "Unknown",
    attendanceHistory: attendanceHistory.map((a) => ({
      date: a.date,
      status: a.status,
    })),
    leaveHistory: leaveHistory.map((l) => ({
      leaveType: l.leaveType,
      startDate: l.startDate,
      endDate: l.endDate,
      status: l.status,
    })),
  };
}
