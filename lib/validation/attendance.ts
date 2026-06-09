import { z } from "zod";

export const attendanceCorrectionSchema = z.object({
  employeeId: z.uuid(),
  attendanceDate: z.string().min(1),
  status: z.enum(["present", "late", "absent", "half_day"]),
  notes: z.string().optional(),
});
