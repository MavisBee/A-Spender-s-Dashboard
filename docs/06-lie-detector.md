# App Behavior: Lie Detector Check

This document outlines five statements regarding the internal mechanics, state management, and rendering behaviors of the Receipts spending dashboard application. Of these, four are true and one is a lie.

---

## The Five Statements

1. **[TRUE] Default State Seeding:** The application uses a custom React hook `useLocalStorage` to load stored expenses. If no item exists under the key `'receipts'` in `localStorage`, the app automatically falls back to and populates the dashboard with a predefined array of mock expenses (`SEED_EXPENSES`).
2. **[TRUE] Numeric Floating-Point Protection:** When submitting the add-expense form, user inputs are parsed as floats and explicitly rounded using `Math.round(num * 100) / 100` before the new expense object is dispatched. This safeguards stored data against floating-point representation anomalies (e.g., storing `$19.99` as `19.990000000000002`).
3. **[TRUE] Conditional Chart Rendering:** The daily breakdown chart component (`DailyChart`) is conditionally omitted from the DOM when the active period filter is set to `'all-time'`.
4. **[TRUE] Auto-Synchronization to Storage:** The custom hook `useLocalStorage` sets up a React `useEffect` listener to serialize and write changes to `localStorage` every time the state or the key changes, eliminating the need to manually invoke persistence logic inside event handlers.
5. **[FALSE] Filter-Aware Daily Breakdown:** When the user selects the `"last-week"` filter, the daily breakdown chart (`DailyChart`) correctly adapts to display the day-by-day distribution of spending for that prior week period.

---

## Identifying the Lie

The **lie** is **Statement 5**: *"When the user selects the 'last-week' filter, the daily breakdown chart (DailyChart) correctly adapts to display the day-by-day distribution of spending for that prior week period."*

In reality, when the `"last-week"` filter is selected, the Daily Chart fails to display any expense data and instead renders an **empty "No data" state**, even if there are multiple expenses in the selected period.

---

## Technical Proof of the Lie

The root cause of this failure mode lies in a complete disconnect between the filtered data passed to the chart and the date range the chart aggregates over.

### 1. Static Date Range Generation in `<DailyChart>`
In [DailyChart.tsx](file:///c:/Users/User1/Downloads/Dev%20final%20task%201/A%20Spender%27s%20Dashboard/receipts/src/components/DailyChart.tsx#L15-L23), the helper function `getLast7Days()` is invoked directly on render:

```typescript
function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}
```

This function constructs an array of date strings (e.g., `["2026-05-18", ..., "2026-05-24"]`) representing the **current last 7 calendar days** relative to the present moment. It does not accept the selected filter or base its ranges on the date window of the expenses passed to it.

### 2. Time-Window Disjunction in `filterExpenses`
When the active filter is set to `"last-week"`, the filter function in [TotalSpend.tsx](file:///c:/Users/User1/Downloads/Dev%20final%20task%201/A%20Spender%27s%20Dashboard/receipts/src/components/TotalSpend.tsx#L30-L59) filters the primary expense list to dates falling inside the *previous* Monday-to-Sunday window.

For example, if the current date is **Sunday, May 24, 2026**:
- **"this-week" window:** Monday, May 18, 2026 to Sunday, May 24, 2026.
- **"last-week" window:** Monday, May 11, 2026 to Sunday, May 17, 2026.
- **`getLast7Days()` range:** Monday, May 18, 2026 to Sunday, May 24, 2026.

All expenses returned by `filterExpenses(expenses, 'last-week')` will have dates falling strictly between **May 11 and May 17**.

### 3. Aggregation Collision
Inside [DailyChart.tsx](file:///c:/Users/User1/Downloads/Dev%20final%20task%201/A%20Spender%27s%20Dashboard/receipts/src/components/DailyChart.tsx#L28-L37), the component maps over `days` (which contains **May 18 to May 24**) and aggregates the values:

```typescript
  const data = days.map((day) => ({
    date: new Date(day + "T00:00:00").toLocaleDateString("en", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    spend: expenses
      .filter((e) => e.date === day) // e.date is May 11-17; day is May 18-24
      .reduce((sum, e) => sum + e.amount, 0),
  }));
```

Because there is zero overlap between the filter-constrained expense dates (`May 11-17`) and the hardcoded rendering range (`May 18-24`), every single element in `data` has a `spend` of `0`.

### 4. Empty State Trigger
Because all spend values are zero, the following guard triggers:

```typescript
  if (data.every((d) => d.spend === 0)) {
    return (
      <div className="chart-container">
        <h3>Last 7 Days</h3>
        <p className="empty">No data</p>
      </div>
    );
  }
```

Thus, the Daily Chart remains permanently broken/empty when `"last-week"` is active, proving the lie.
