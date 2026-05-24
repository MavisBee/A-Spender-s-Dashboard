# Engineering Principles in A Spender's Dashboard

## Single Source of Truth

```
App.tsx:13  const [expenses, setExpenses] = useLocalStorage<Expense[]>("receipts", []);
App.tsx:14  const [filter, setFilter] = useLocalStorage<FilterPeriod>("receipts-filter", "this-week");
```

Exactly two pieces of persisted state in the entire app. Every other value (`filtered`, chart data, total) is *derived* from one or both of these. There is no duplicated state — you never see `filtered` saved to localStorage or synced manually. This is the React mantra: "lift state up, compute everything else down."

The expense list is the single authoritative copy. `handleAdd` appends to it, `handleDelete` removes from it, and every downstream consumer reads from it (or its filtered derivative). No component holds its own copy of expenses.

---

## Derived State

```
App.tsx:30  const filtered = useMemo(() => filterExpenses(expenses, filter), [expenses, filter]);
```

`filtered` is not state. It is a *computed projection* of state. It appears in the render function but is never passed to `useState`. `useMemo` caches the result so React only re-runs the filter when `expenses` or `filter` changes — you get the performance of memoization without the complexity of syncing a third state variable.

Same pattern in the charts:

```
CategoryChart.tsx:10-15  const data = CATEGORIES.map((cat) => ({
                          name: ...,
                          value: expenses.filter(...).reduce(...),
                        })).filter((d) => d.value > 0);

DailyChart.tsx:28-37     const data = days.map((day) => ({
                          date: ...,
                          spend: expenses.filter((e) => e.date === day).reduce(...),
                        }));
```

Both chart data arrays are derived inline during rendering. They read from `props.expenses` (which is already `filtered`) and produce chart-ready structures. No effects, no `useState`, no setters. If expenses change, the chart data changes automatically on the next render.

Implication: you can never have a stale chart. There's no "sync" step to forget to call.

---

## Immutability

Three mutations happen in this app (add, delete, filter). All three create new arrays instead of modifying existing ones:

**Add** — prepend via spread (never `.push`):
```
App.tsx:18  setExpenses((prev) => [expense, ...prev]);
```

**Delete** — filter out the target (never `.splice`):
```
App.tsx:25  setExpenses((prev) => prev.filter((e) => e.id !== id));
```

**Filter** — return a subset (the input array is never touched):
```
TotalSpend.tsx:55  return expenses.filter((e) => {
                    const d = new Date(e.date + "T00:00:00");
                    return d >= start && d <= end;
                  });
```

Each call returns a fresh reference. React's `useMemo` and `useCallback` rely on reference equality to skip unnecessary re-renders — immutability is what makes those optimizations safe.

Even `getWeekRange` (line 8) clones its argument before modifying it: `const d = new Date(date)`. The caller's date object is never mutated.

---

## Pure Functions for Filtering

```
TotalSpend.tsx:30-59  export function filterExpenses(expenses, period): Expense[]
```

`filterExpenses` is a **pure function**:
- **Deterministic**: same `expenses` array + same `period` string always returns the same result.
- **No side effects**: it does not write to state, log to the console, modify the DOM, or touch `localStorage`. It reads `new Date()` (impure by nature), but this is acceptable for time-based filtering — the function *describes* the current week, it doesn't alter anything.
- **No mutations**: it returns a new array via `Array.filter`. The input `expenses` is read-only.

The function is exported from a component file (`TotalSpend.tsx`) and imported by `App.tsx`. It's a plain function, not a hook or a component — easy to test in isolation:
```
const result = filterExpenses(mockExpenses, "this-week");
assert(result.length === 3);
```

---

## Separation of Data and Presentation

The architecture draws a clean line between *where data lives* and *how it's displayed*:

| Layer | Files | Responsibility |
|-------|-------|----------------|
| State source | `App.tsx`, `useLocalStorage.ts` | Store, persist, mutate |
| Derivation | `App.tsx:30`, chart components | Compute views from state |
| Presentation | All components | Render UI, handle user events |

Components receive exactly what they need as props and no more:

- `TotalSpend` receives `expenses: Expense[]` — it only knows how to sum and render. It has no idea what filter is active.
- `CategoryChart` receives `expenses: Expense[]` — it doesn't know about filters, localStorage, or the form. It just groups by category and draws a donut.
- `ExpenseForm` receives `onAdd: (expense) => void` — it manages its own local input state and calls `onAdd` on submit. It never touches the expenses list directly.
- `Filter` receives `value` and `onChange` — it doesn't know what `onChange` does. The same component could control a theme toggle.

This makes each piece independently understandable, testable, and replaceable.

---

## Summary Table

| Principle | Where | How |
|-----------|-------|-----|
| Single Source of Truth | `App.tsx:13-14` | Two `useLocalStorage` calls, everything else derived |
| Derived State | `App.tsx:30`, `CategoryChart.tsx:10`, `DailyChart.tsx:28` | `useMemo` and inline `map`/`filter`/`reduce` |
| Immutability | `App.tsx:18,25`, `TotalSpend.tsx:55` | Spread, `Array.filter` — never `.push`/`.splice` |
| Pure Functions | `TotalSpend.tsx:30-59` | `filterExpenses` — deterministic, no side effects, no mutations |
| Separation of Concerns | All components | Props-only data flow, no shared global state, local form state isolated |
