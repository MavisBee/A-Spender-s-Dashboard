# Line-by-Line Explanation: A Spender's Dashboard

## `src/types.ts` — Building blocks

```
1: export interface Expense {
2:   id: string;
3:   amount: number;
4:   category: "food" | "transport" | "data" | "fun" | "other";
5:   date: string;
6: }
```

Shapes one expense. Every expense has a unique `id` (a UUID), a number `amount`, exactly one of five `category` values, and a `date` stored as a `YYYY-MM-DD` string. The union type on line 4 means TypeScript will yell at you if you type `"groceries"` — only those five strings are allowed.

```
 8: export type Category = Expense["category"];
```

Reads the category type directly out of the `Expense` interface so we never have to write `"food" | "transport" | ...` twice. If we add a category later, this updates automatically.

```
10: export type FilterPeriod = "this-week" | "last-week" | "all-time";
```

Three possible filter states — like radio buttons stored in a string.

```
12: export const CATEGORIES: Category[] = ["food", "transport", "data", "fun", "other"];
13:
14: export const CATEGORY_COLORS: Record<Category, string> = {
15:   food: "#EF4444",
16:   transport: "#3B82F6",
17:   data: "#8B5CF6",
18:   fun: "#F59E0B",
19:   other: "#6B7280",
20: };
```

`CATEGORIES` is an ordered list so loops (like in the form's `<select>`) render categories in a predictable order. `CATEGORY_COLORS` maps each category to a hex color used for both the donut chart slices and the list-item badges. Using a `Record<Category, string>` means if you add a new category without adding a color, TypeScript will complain at compile time.

---

## `src/hooks/useLocalStorage.ts` — Saving between page loads

```
1: import { useState, useEffect } from "react";
2:
3: export function useLocalStorage<T>(key: string, initial: T): [T, (value: T | ((prev: T) => T)) => void] {
```

Generic hook: `<T>` works for any type. Returns the same signature as `useState` — a value and a setter — so it drops into any component that already uses `useState`.

```
4:   const [stored, setStored] = useState<T>(() => {
5:     try {
6:       const item = localStorage.getItem(key);
7:       return item ? (JSON.parse(item) as T) : initial;
8:     } catch {
9:       return initial;
10:     }
11:   });
```

Lazy initializer (the `() => {` arrow function runs once when the component mounts). It reads from `localStorage` and falls back to `initial` if:
- the key doesn't exist (line 7 false branch), or
- `JSON.parse` throws because the stored data is corrupted (line 8 `catch`).

This means a corrupted localStorage value silently resets instead of crashing the app.

```
13:   useEffect(() => {
14:     try {
15:       localStorage.setItem(key, JSON.stringify(stored));
16:     } catch {
17:       // storage full or unavailable
18:     }
19:   }, [key, stored]);
20:
21:   return [stored, setStored];
```

Every time `stored` changes, the effect writes it back to `localStorage`. The `catch` on line 16 handles the "quota exceeded" or private-browsing case — the app still works in memory, it just won't persist.

---

## `src/main.tsx` — Entry point

```
1: import { StrictMode } from "react";
2: import { createRoot } from "react-dom/client";
3: import "./index.css";
4: import App from "./App";
5:
6: createRoot(document.getElementById("root")!).render(
7:   <StrictMode>
8:     <App />
9:   </StrictMode>
10: );
```

`createRoot` mounts React. `StrictMode` double-invokes effects in development to surface bugs. `!` (the non-null assertion) tells TypeScript "trust me, there is a `#root` element in index.html."

---

## `src/App.tsx` — The conductor

```
 1: import { useCallback, useMemo } from "react";
 2: import type { Expense, FilterPeriod } from "./types";
 3: import { useLocalStorage } from "./hooks/useLocalStorage";
 4: import ExpenseForm from "./components/ExpenseForm";
 5: import Filter from "./components/Filter";
 6: import CategoryChart from "./components/CategoryChart";
 7: import DailyChart from "./components/DailyChart";
 8: import TotalSpend from "./components/TotalSpend";
 9: import { filterExpenses } from "./components/TotalSpend";
10: import "./App.css";
```

Line 9 imports the filter function directly from the component file — no separate `utils.ts`. This is fine for a small app; the function is a pure computation, not a React component, so it can be exported from anywhere.

```
12: export default function App() {
13:   const [expenses, setExpenses] = useLocalStorage<Expense[]>("receipts", []);
14:   const [filter, setFilter] = useLocalStorage<FilterPeriod>("receipts-filter", "this-week");
```

Two pieces of top-level state, both persisted:
- `expenses` — the full, unfiltered list. Empty array if nothing stored.
- `filter` — defaults to `"this-week"`, so on first visit the user sees current week spending without clicking anything.

```
16:   const handleAdd = useCallback(
17:     (expense: Expense) => {
18:       setExpenses((prev) => [expense, ...prev]);
19:     },
20:     [setExpenses]
21:   );
```

Appends a new expense to the **front** of the list (line 18 spread: `[expense, ...prev]`). Using the functional updater `(prev) => ...` instead of reading `expenses` directly means the callback never goes stale even if setExpenses is batched. `useCallback` memoizes the function so `ExpenseForm` doesn't re-render when nothing changed.

```
23:   const handleDelete = useCallback(
24:     (id: string) => {
25:       setExpenses((prev) => prev.filter((e) => e.id !== id));
26:     },
27:     [setExpenses]
28:   );
```

Deletes by filtering **out** the matching ID. Again uses functional updater. `Array.filter` returns a new array — the original `prev` is never mutated.

```
30:   const filtered = useMemo(() => filterExpenses(expenses, filter), [expenses, filter]);
```

**This is the key line for "state derived from raw expenses."** `filtered` is not stored in state — it is computed *from* state on every render. `useMemo` only re-runs the calculation when `expenses` or `filter` changes, so the filter function isn't called on unrelated re-renders. The original `expenses` array is never touched; `filterExpenses` returns a *new* array of the matching expense objects (same object references, just fewer of them).

```
32:   return (
33:     <div className="app">
34:       <header className="app-header">
35:         <h1>Receipts</h1>
36:         <p className="subtitle">Track what your money has been doing behind your back.</p>
37:       </header>
38:
39:       <ExpenseForm onAdd={handleAdd} />
40:
41:       <Filter value={filter} onChange={setFilter} />
42:
43:       <TotalSpend expenses={filtered} />
44:
45:       <div className="charts">
46:         <CategoryChart expenses={filtered} />
47:         {filter !== "all-time" && <DailyChart expenses={filtered} />}
48:       </div>
```

Relevant props flow:
- `handleAdd` and `handleDelete` mutate the source `expenses` state.
- Everything else receives `filtered` (the derived, filtered view).
- Line 47: `DailyChart` is conditionally rendered. When the filter is `"all-time"`, the chart is removed from the DOM entirely because showing "last 7 days" alongside all-time data would be misleading.

```
50:       <section className="expense-list">
51:         <h3>Expenses</h3>
52:         {filtered.length === 0 ? (
53:           <p className="empty">No expenses yet</p>
54:         ) : (
55:           <ul>
56:             {filtered.map((e) => (
57:               <li key={e.id}>
```

Line 52's ternary: if `filtered` is empty (nothing matches, or no expenses exist), show a placeholder instead of an empty list. Line 57's `key={e.id}` gives React a stable identity per expense for efficient re-renders and correct list animations.

---

## `src/components/ExpenseForm.tsx` — Adding data

```
10:   const [amount, setAmount] = useState("");
11:   const [category, setCategory] = useState<Category>("food");
12:   const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
```

Three local state pieces — only exist inside the form, no need to lift them up. Line 12's lazy initializer computes today's date *once* when the component mounts, instead of on every render. `new Date().toISOString().split("T")[0]` produces `"2026-05-24"` — a clean `YYYY-MM-DD` string with no time or timezone.

```
14:   const handleSubmit = (e: React.FormEvent) => {
15:     e.preventDefault();
16:     const num = parseFloat(amount);
17:     if (!num || num <= 0) return;
18:     onAdd({
19:       id: crypto.randomUUID(),
20:       amount: Math.round(num * 100) / 100,
21:       category,
22:       date,
23:     });
24:     setAmount("");
25:   };
```

Line 15 prevents the page reload that a form submit normally triggers. Line 17 guards: `parseFloat("")` returns `NaN`, which is falsy, and negative/zero amounts are also rejected. Line 19 uses `crypto.randomUUID()` (available in all modern browsers) instead of a library — generates a unique string like `"a1b2c3d4-..."`. Line 20 rounds to 2 decimal places to avoid floating-point artifacts like `3.3000000000000003`. After adding, only `amount` resets; `category` and `date` keep their previous values as a convenience for adding multiple expenses in the same category.

---

## `src/components/Filter.tsx` — Choosing a time window

```
 8: const OPTIONS: { value: FilterPeriod; label: string }[] = [
 9:   { value: "this-week", label: "This Week" },
10:   { value: "last-week", label: "Last Week" },
11:   { value: "all-time", label: "All Time" },
12: ];
```

Static array outside the component — never re-created on re-renders. Each option connects a value the filter logic understands to a human-readable label.

```
14: export default function Filter({ value, onChange }: Props) {
15:   return (
16:     <div className="filter-bar">
17:       {OPTIONS.map((opt) => (
18:         <button
19:           key={opt.value}
20:           className={value === opt.value ? "active" : ""}
21:           onClick={() => onChange(opt.value)}
22:         >
23:           {opt.label}
24:         </button>
25:       ))}
26:     </div>
27:   );
28: }
```

Line 20: the active button gets the CSS class `"active"` (styled as a filled pill); the others remain outlined. Line 21 calls `onChange` with the selected value, which flows up to `App.tsx`'s `setFilter`.

---

## `src/components/TotalSpend.tsx` — The filter engine and the total

### `getWeekRange` — Math helper

```
 7: function getWeekRange(date: Date): { start: Date; end: Date } {
 8:   const d = new Date(date);
 9:   const day = d.getDay();
10:   const diff = d.getDate() - day + (day === 0 ? -6 : 1);
11:   const start = new Date(d.setDate(diff));
12:   start.setHours(0, 0, 0, 0);
13:   const end = new Date(start);
14:   end.setDate(end.getDate() + 6);
15:   end.setHours(23, 59, 59, 999);
16:   return { start, end };
17: }
```

Converts any date into a Monday–Sunday range. The trick is on line 10: `getDay()` returns 0 for Sunday, 1 for Monday, etc. For Sunday (`day === 0`), `diff` becomes `d.getDate() - 0 - 6`, which goes back to the previous Monday. For Monday through Saturday, `d.getDate() - day + 1` snaps to the current week's Monday. Line 8 clones the date with `new Date(date)` to avoid mutating the argument.

### `filterExpenses` — Pure filtering function

```
30: export function filterExpenses(
31:   expenses: Expense[],
32:   period: "this-week" | "last-week" | "all-time"
33: ): Expense[] {
34:   if (period === "all-time") return expenses;
```

Line 34: early return — no filtering needed, returns the **same array reference**. This is important for performance: React's `useMemo` can detect that the reference didn't change and skip re-renders of downstream components.

```
36:   const now = new Date();
37:   const { start: thisStart } = getWeekRange(now);
38:
39:   let start: Date;
40:   let end: Date;
41:
42:   if (period === "this-week") {
43:     start = thisStart;
44:     end = new Date(thisStart);
45:     end.setDate(end.getDate() + 6);
46:     end.setHours(23, 59, 59, 999);
47:   } else {
48:     start = new Date(thisStart);
49:     start.setDate(start.getDate() - 7);
50:     end = new Date(thisStart);
51:     end.setDate(end.getDate() - 1);
52:     end.setHours(23, 59, 59, 999);
53:   }
```

For "this-week", `start` = Monday 00:00:00.000, `end` = next Sunday 23:59:59.999.

For "last-week", `start` = last Monday (this Monday - 7 days), `end` = last Sunday (this Monday - 1 day) at 23:59:59.999.

Line 47's `else` handles `"last-week"` because `"all-time"` already returned early. No `else if` needed.

```
55:   return expenses.filter((e) => {
56:     const d = new Date(e.date + "T00:00:00");
57:     return d >= start && d <= end;
58:   });
```

**This is the "filtering without mutation" line.** `Array.filter` creates a brand new array containing only the elements that pass the test. The original `expenses` array is never modified. Line 56 parses the stored `YYYY-MM-DD` string with `"T00:00:00"` appended so that JavaScript treats it as local midnight instead of UTC midnight — this prevents off-by-one errors for users in negative UTC offsets.

### `TotalSpend` component

```
19: export default function TotalSpend({ expenses }: Props) {
20:   const total = expenses.reduce((s, e) => s + e.amount, 0);
```

`expenses` here is the **already-filtered** array (passed from `App.tsx` line 43). `reduce` walks every expense in the filtered list and sums their amounts. Starting at `0` ensures an empty filtered list produces `0`, not a crash.

---

## `src/components/CategoryChart.tsx` — Donut chart aggregation

```
10:   const data = CATEGORIES.map((cat: Category) => ({
11:     name: cat.charAt(0).toUpperCase() + cat.slice(1),
12:     value: expenses
13:       .filter((e) => e.category === cat)
14:       .reduce((sum, e) => sum + e.amount, 0),
15:   })).filter((d) => d.value > 0);
```

**How chart data is derived from raw expenses:** This builds one entry per category by:
1. Mapping over the static `CATEGORIES` array (guarantees a fixed order: food, transport, data, fun, other).
2. For each category, filtering the (already-filtered) `expenses` array to just that category, then summing their amounts.
3. At the end, `.filter((d) => d.value > 0)` removes categories with zero spend so the donut chart doesn't show empty slices.

The `expenses` prop is `filtered` from `App.tsx`. So if the user selects "Last Week," the chart automatically re-aggregates only last week's expenses — no additional state needed.

```
17:   if (data.length === 0) {
18:     return (
19:       <div className="chart-container">
20:         <h3>By Category</h3>
21:         <p className="empty">No data</p>
22:       </div>
23:     );
24:   }
```

Early return for empty state: after filtering out zero-value categories, if nothing remains, render a placeholder instead of an empty chart (which would show a blank square with no axes).

```
32:             data={data}
33:             cx="50%"
34:             cy="50%"
35:             innerRadius={60}
36:             outerRadius={100}
37:             dataKey="value"
```

`innerRadius={60}` + `outerRadius={100}` creates a donut (pie with a hole). `cx`/`cy` centers it. `dataKey="value"` tells Recharts which field in each datum represents the numeric value.

```
39:             {data.map((d) => (
40:               <Cell key={d.name} fill={CATEGORY_COLORS[d.name.toLowerCase() as Category]} />
41:             ))}
```

Each slice gets its color from the `CATEGORY_COLORS` lookup. The `as Category` cast is safe because `d.name` is always one of the five known categories (uppercased first letter).

```
43:           <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
```

`formatter` overrides the default tooltip display — shows `$12.50` instead of a bare number.

---

## `src/components/DailyChart.tsx` — Bar chart aggregation

```
15: function getLast7Days(): string[] {
16:   const days: string[] = [];
17:   for (let i = 6; i >= 0; i--) {
18:     const d = new Date();
19:     d.setDate(d.getDate() - i);
20:     days.push(d.toISOString().split("T")[0]);
21:   }
22:   return days;
23: }
```

Generates seven `YYYY-MM-DD` strings from today backward. `i` goes 6, 5, 4, 3, 2, 1, 0 so the array is ordered oldest-first (today at index 6). This makes the bar chart read left-to-right chronologically.

```
26:   const days = getLast7Days();
27:
28:   const data = days.map((day) => ({
29:     date: new Date(day + "T00:00:00").toLocaleDateString("en", {
30:       weekday: "short",
31:       month: "short",
32:       day: "numeric",
33:     }),
34:     spend: expenses
35:       .filter((e) => e.date === day)
36:       .reduce((sum, e) => sum + e.amount, 0),
37:   }));
```

**How the bar chart gets its data:** For each of the 7 calendar days, filter the (already-filtered) `expenses` to those whose `e.date` equals that day's string, then sum. The `date` property is a human-readable label like `"Mon, May 18"`.

String equality (`e.date === day`) works because both are `YYYY-MM-DD`. No timezone parsing needed. Every day gets an entry — even days with zero spend — because the array is built by mapping over `days` (the calendar), not over the expenses. This ensures the bar chart shows a complete 7-day window.

```
39:   if (data.every((d) => d.spend === 0)) {
40:     return (
41:       <div className="chart-container">
42:         <h3>Last 7 Days</h3>
43:         <p className="empty">No data</p>
44:       </div>
45:     );
46:   }
```

Checks if **every** day has zero spend before showing the empty state. If even one day has a transaction, the chart renders.

---

## Summary: Data flow without mutation

```
Raw source of truth:
  expenses (useLocalStorage)  ──┬── handleAdd (prepend new)
                                └── handleDelete (filter out by id)
                                        │
                                        ▼
Derived filtered view:
  filtered = useMemo(() => filterExpenses(expenses, filter))
                    │
                    ├──► TotalSpend       — reduce to a single number
                    ├──► CategoryChart    — group + reduce by category
                    ├──► DailyChart       — lookup by day string
                    └──► expense list     — map to <li> elements
```

1. **State lives in one place** — `expenses` in App.tsx, persisted via `useLocalStorage`.
2. **No mutation** — `handleAdd` spreads into a new array. `handleDelete` returns a filtered copy. `filterExpenses` calls `Array.filter` which returns a new array. The original `expenses` reference is never modified.
3. **Derived state** — `filtered` is computed with `useMemo`, not stored as state. Charts and totals receive `filtered` and derive their chart data inline during render. There is no "synced state" that can go stale.
4. **Filtering is a pure function** — same `expenses` + same `filter` always produces the same `filtered` array. It reads `expenses` and returns a new array; it never writes or mutates.
