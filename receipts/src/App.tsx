import { useCallback, useMemo } from "react";
import type { Expense, FilterPeriod } from "./types";
import { useLocalStorage } from "./hooks/useLocalStorage";
import ExpenseForm from "./components/ExpenseForm";
import Filter from "./components/Filter";
import CategoryChart from "./components/CategoryChart";
import DailyChart from "./components/DailyChart";
import TotalSpend from "./components/TotalSpend";
import { filterExpenses } from "./components/TotalSpend";
import "./App.css";

export default function App() {
  const [expenses, setExpenses] = useLocalStorage<Expense[]>("receipts", []);
  const [filter, setFilter] = useLocalStorage<FilterPeriod>("receipts-filter", "this-week");

  const handleAdd = useCallback(
    (expense: Expense) => {
      setExpenses((prev) => [expense, ...prev]);
    },
    [setExpenses]
  );

  const handleDelete = useCallback(
    (id: string) => {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    },
    [setExpenses]
  );

  const filtered = useMemo(() => filterExpenses(expenses, filter), [expenses, filter]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Receipts</h1>
        <p className="subtitle">Track what your money has been doing behind your back.</p>
      </header>

      <ExpenseForm onAdd={handleAdd} />

      <Filter value={filter} onChange={setFilter} />

      <TotalSpend expenses={filtered} />

      <div className="charts">
        <CategoryChart expenses={filtered} />
        {filter !== "all-time" && <DailyChart expenses={filtered} />}
      </div>

      <section className="expense-list">
        <h3>Expenses</h3>
        {filtered.length === 0 ? (
          <p className="empty">No expenses yet</p>
        ) : (
          <ul>
            {filtered.map((e) => (
              <li key={e.id}>
                <span className="el-cat" data-cat={e.category}>
                  {e.category}
                </span>
                <span className="el-date">{e.date}</span>
                <span className="el-amount">${e.amount.toFixed(2)}</span>
                <button className="el-del" onClick={() => handleDelete(e.id)}>
                  &times;
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
