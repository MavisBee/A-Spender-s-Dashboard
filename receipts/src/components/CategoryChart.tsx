import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { Expense, Category } from "../types";
import { CATEGORIES, CATEGORY_COLORS } from "../types";

interface Props {
  expenses: Expense[];
}

export default function CategoryChart({ expenses }: Props) {
  const data = CATEGORIES.map((cat: Category) => ({
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    value: expenses
      .filter((e) => e.category === cat)
      .reduce((sum, e) => sum + e.amount, 0),
  })).filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="chart-container">
        <h3>By Category</h3>
        <p className="empty">No data</p>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3>By Category</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            dataKey="value"
          >
            {data.map((d) => (
              <Cell key={d.name} fill={CATEGORY_COLORS[d.name.toLowerCase() as Category]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
