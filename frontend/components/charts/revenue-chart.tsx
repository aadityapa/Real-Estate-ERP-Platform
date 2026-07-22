"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { month: "Jan", revenue: 4200000 },
  { month: "Feb", revenue: 5100000 },
  { month: "Mar", revenue: 4800000 },
  { month: "Apr", revenue: 6200000 },
  { month: "May", revenue: 5800000 },
  { month: "Jun", revenue: 7100000 },
];

export function RevenueChart(): React.ReactElement {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="month"
          stroke="var(--muted-foreground)"
          fontSize={12}
          tickLine={false}
          axisLine={{ stroke: "var(--border)" }}
        />
        <YAxis
          stroke="var(--muted-foreground)"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `₹${(v / 100000).toFixed(0)}L`}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          contentStyle={{
            background: "var(--surface-elevated)",
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            color: "var(--foreground)",
            fontSize: "0.8125rem",
          }}
          labelStyle={{ color: "var(--muted-foreground)" }}
          formatter={(value: number) => [
            `₹${value.toLocaleString("en-IN")}`,
            "Revenue",
          ]}
        />
        <Bar dataKey="revenue" fill="var(--accent)" radius={[6, 6, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
