import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Expense } from "../types";

interface Props {
  expenses: Expense[];
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

export default function DailyChart({ expenses }: Props) {
  const days = getLast7Days();

  const data = days.map((day) => ({
    date: new Date(day + "T00:00:00").toLocaleDateString("en", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    spend: expenses
      .filter((e) => e.date === day)
      .reduce((sum, e) => sum + e.amount, 0),
  }));

  if (data.every((d) => d.spend === 0)) {
    return (
      <div className="chart-container">
        <h3>Last 7 Days</h3>
        <p className="empty">No data</p>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3>Last 7 Days</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
          <Bar dataKey="spend" fill="#3B82F6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
