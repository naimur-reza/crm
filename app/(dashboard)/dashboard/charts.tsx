"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

const TASK_COLORS: Record<string, string> = {
  todo: "#94a3b8",
  "in progress": "#f59e0b",
  review: "#8b5cf6",
  done: "#10b981",
  blocked: "#ef4444",
};

const CLIENT_COLORS = ["#3995d2", "#10b981", "#f59e0b", "#94a3b8"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-foreground">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-muted-foreground">
          {entry.name}: <span className="font-semibold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export function DashboardCharts({
  taskStatusData,
  weeklyData,
  clientStatusData,
}: {
  taskStatusData: { name: string; value: number }[];
  weeklyData: { date: string; count: number }[];
  clientStatusData: { name: string; value: number }[];
}) {
  return (
    <section className="grid gap-6 md:grid-cols-3">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold text-foreground">Task Status</h3>
        <p className="mb-4 text-xs text-muted-foreground">Distribution by current stage</p>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={taskStatusData} layout="vertical" barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={80} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {taskStatusData.map((entry) => (
                  <Cell key={entry.name} fill={TASK_COLORS[entry.name.toLowerCase()] || "#94a3b8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold text-foreground">Weekly Attendance</h3>
        <p className="mb-4 text-xs text-muted-foreground">Last 7 days check-ins</p>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#3995d2" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-1 text-sm font-semibold text-foreground">Client Pipeline</h3>
        <p className="mb-4 text-xs text-muted-foreground">Accounts by status</p>
        <div className="flex h-52 items-center justify-center">
          {clientStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={clientStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {clientStatusData.map((_, i) => (
                    <Cell key={i} fill={CLIENT_COLORS[i % CLIENT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">No data</p>
          )}
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {clientStatusData.map((entry, i) => (
            <span key={entry.name} className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CLIENT_COLORS[i % CLIENT_COLORS.length] }} />
              {entry.name}: {entry.value}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
