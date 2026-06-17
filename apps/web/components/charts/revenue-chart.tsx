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
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
        <YAxis
          stroke="#64748b"
          fontSize={12}
          tickFormatter={(v: number) => `₹${(v / 100000).toFixed(0)}L`}
        />
        <Tooltip
          formatter={(value: number) => [
            `₹${value.toLocaleString("en-IN")}`,
            "Revenue",
          ]}
        />
        <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
