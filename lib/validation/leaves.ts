import { z } from "zod/v4";

export const leaveRequestSchema = z.object({
  employeeId: z.uuid(),
  leaveType: z.enum(["sick", "casual", "annual", "unpaid", "other"]),
  startDate: z.string().min(1, "Start date is required."),
  endDate: z.string().min(1, "End date is required."),
  reason: z.string().min(1, "Reason is required.").trim(),
});

export const leaveReviewSchema = z.object({
  id: z.uuid(),
  status: z.enum(["approved", "rejected"]),
  adminNotes: z.string().optional(),
});
