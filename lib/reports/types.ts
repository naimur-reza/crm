export type ReportType =
  | "attendance"
  | "crm-funnel"
  | "revenue"
  | "expenses"
  | "payroll"
  | "tasks"
  | "leaves"
  | "executive";

export type ReportMeta = {
  type: ReportType;
  label: string;
  description: string;
  icon: string;
  roles: string[];
};

export const REPORT_METAS: ReportMeta[] = [
  {
    type: "attendance",
    label: "Attendance Summary",
    description: "Per-employee attendance breakdown with present, late, absent, and half-day counts.",
    icon: "CalendarCheck",
    roles: ["admin", "hr", "manager"],
  },
  {
    type: "crm-funnel",
    label: "CRM Funnel",
    description: "Lead pipeline conversion rates, stage distribution, and win/loss analysis.",
    icon: "TrendingUp",
    roles: ["admin", "manager", "sales"],
  },
  {
    type: "revenue",
    label: "Revenue by Client",
    description: "Invoice revenue breakdown by client with payment status tracking.",
    icon: "BadgeDollarSign",
    roles: ["admin", "manager", "sales"],
  },
  {
    type: "expenses",
    label: "Expense by Category",
    description: "Expense claims summarized by category with approval and reimbursement status.",
    icon: "Receipt",
    roles: ["admin", "hr", "manager"],
  },
  {
    type: "payroll",
    label: "Payroll Summary",
    description: "Payroll cost breakdown by period including gross pay, deductions, and net pay.",
    icon: "CreditCard",
    roles: ["admin", "hr"],
  },
  {
    type: "tasks",
    label: "Task Completion",
    description: "Task completion rates by employee, status, and priority levels.",
    icon: "CheckSquare",
    roles: ["admin", "hr", "manager"],
  },
  {
    type: "leaves",
    label: "Leave Utilization",
    description: "Leave balance usage by type and employee, highlighting trends.",
    icon: "CalendarDays",
    roles: ["admin", "hr", "manager"],
  },
  {
    type: "executive",
    label: "Executive Summary",
    description: "Cross-module executive overview with key metrics across all departments.",
    icon: "BarChart3",
    roles: ["admin", "manager"],
  },
];

export type SummaryCard = {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "green" | "amber" | "red" | "blue" | "purple";
};

export type ReportColumn = {
  key: string;
  label: string;
  format?: "text" | "number" | "currency" | "date" | "percent";
};

export type ReportResult = {
  title: string;
  description: string;
  summaryCards: SummaryCard[];
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  chartData?: Record<string, unknown>[];
  chartType?: "bar" | "pie" | "line" | "doughnut";
};
