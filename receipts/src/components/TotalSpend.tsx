import type { Expense } from "../types";

interface Props {
  expenses: Expense[];
}

function getWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export default function TotalSpend({ expenses }: Props) {
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="total-spend">
      <span className="total-label">Total</span>
      <span className="total-amount">${total.toFixed(2)}</span>
    </div>
  );
}

export function filterExpenses(
  expenses: Expense[],
  period: "this-week" | "last-week" | "all-time"
): Expense[] {
  if (period === "all-time") return expenses;

  const now = new Date();
  const { start: thisStart } = getWeekRange(now);

  let start: Date;
  let end: Date;

  if (period === "this-week") {
    start = thisStart;
    end = new Date(thisStart);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  } else {
    start = new Date(thisStart);
    start.setDate(start.getDate() - 7);
    end = new Date(thisStart);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
  }

  return expenses.filter((e) => {
    const d = new Date(e.date + "T00:00:00");
    return d >= start && d <= end;
  });
}
