# Audit: Edge Cases, Failure Modes, and Assumptions

## 1. localStorage Failures

### Quota Exceeded

```
useLocalStorage.ts:13-19  useEffect(() => {
                            try {
                              localStorage.setItem(key, JSON.stringify(stored));
                            } catch {
                              // storage full or unavailable
                            }
                          }, [key, stored]);
```

The write path has a try/catch that silently swallows quota errors. If the user exceeds the ~5 MB limit, the app continues working in memory — but the data is lost on page refresh. There is no user-facing feedback (no toast, no console warning visible to the user). The user will silently lose their data.

### Corrupted Storage

```
useLocalStorage.ts:4-11  const [stored, setStored] = useState<T>(() => {
                           try {
                             const item = localStorage.getItem(key);
                             return item ? (JSON.parse(item) as T) : initial;
                           } catch {
                             return initial;
                           }
                         });
```

If a user manually edits localStorage and introduces invalid JSON, the `catch` returns `initial` (empty array or `"this-week"`). The data resets silently — no error shown. If localStorage was valid JSON but the **wrong shape** (e.g. an object instead of an array for `"receipts"`), `JSON.parse` succeeds, the `as T` cast is erased at runtime, and downstream code like `.filter()` or `.reduce()` crashes with a `TypeError`. There is no runtime schema validation.

### Private Browsing / Storage Unavailable

In old Safari private browsing mode, `localStorage` exists but `setItem` throws. Caught by the same try/catch. The app works in memory for the session but nothing persists.

### Recovery Gap

On first mount, `useEffect` fires after render and overwrites whatever was read from storage with the same data. This is a no-op in normal use, but it means there's a brief moment where the app renders with stored data, then re-saves it. Harmless but redundant.

---

## 2. Empty States

### Tracked across all components

| Component | Empty Trigger | Rendered Output | Correct? |
|-----------|---------------|-----------------|----------|
| Expense list | `filtered.length === 0` | `"No expenses yet"` | ✅ |
| TotalSpend | No check needed | `$0.00` (reduce with init 0) | ✅ |
| CategoryChart | `data.length === 0` (after zero-value filter) | `"No data"` + heading | ✅ |
| DailyChart | `data.every(d => d.spend === 0)` | `"No data"` + heading | ✅ |
| DailyChart (all-time filter) | Not rendered by parent | (DOM absent) | ✅ |
| ExpenseForm | Not dependent on expenses | Renders normally | ✅ |
| Filter | Not dependent on expenses | Renders normally | ✅ |

### Edge: freshly visited with no data

First visit: localStorage returns nothing. `expenses` = `[]`, `filter` = `"this-week"`.
- `filterExpenses([], "this-week")` → `[]` (filters empty list → empty list).
- `filtered` = `[]`.
- All empty states trigger correctly.

### Edge: filter with no matching expenses

User has 10 expenses from last week, switches to "This Week": `filtered` = `[]`. Every empty state triggers. No crashes.

### Edge: all expenses deleted

`handleDelete` eventually produces `[]`. Same flow as fresh visit. Correct.

---

## 3. Performance at 1,000 Expenses

### Computational Cost per Action

| Operation | Complexity | Notes |
|-----------|------------|-------|
| `filterExpenses` | O(n) | Parses every date string with `new Date(...)` |
| `TotalSpend.reduce` | O(n) | Sums all amounts |
| `CategoryChart` data | O(5n) | 5 categories × filter+reduce each pass |
| `DailyChart` data | O(7n) | 7 days × filter+reduce each pass |
| `handleAdd` | O(n) | Spread creates a new array ~n+1 |
| `handleDelete` | O(n) | Filter creates new array ~n-1 |
| Expense list render | O(n) | 1,000 `<li>` DOM nodes |

### What happens when adding one expense

1. `setExpenses` triggers re-render of `App`.
2. `filterExpenses` iterates all 1,001 items (creates 1,001 `Date` objects).
3. `TotalSpend` re-renders, sums 1,001 items.
4. `CategoryChart` runs 5 × filter+reduce over 1,001 items each (worst case ~5,005 iterations + 5 intermediate arrays of up to 1,001 items).
5. `DailyChart` runs 7 × filter+reduce over 1,001 items (worst case ~7,007 iterations + 7 intermediate arrays).
6. Expense list renders 1,001 `<li>` elements in the DOM.

### Missing optimizations

- **No virtualization**: the entire expense list is one flat `<ul>` with 1,000+ `<li>` nodes. No pagination or windowing (react-window, Intersection Observer).
- **No memoization on chart data**: `CategoryChart` and `DailyChart` do not wrap their data computation in `useMemo`. Every re-render of the chart component recomputes the data arrays even if `expenses` hasn't changed. The parent `App` re-renders on any state change, so filtering the list causes both charts to recompute their data even though only the list changed.
- **Redundant intermediate arrays**: `expenses.filter(cat).reduce(...)` creates a full intermediate array just to sum it. A single `reduce` with a conditional would avoid allocations.
- **Date parsing overhead**: `filterExpenses` creates a `Date` object per expense every time. Pre-parsing dates on write and storing a timestamp would eliminate this.

### What would break first

- **DOM**: 1,000 list items is manageable but scrolling will show jank on low-end devices.
- **Charts**: Recharts handles 5 categories and 7 bars trivially. No bottleneck there.
- **The real cost is unnecessary recomputation**: the chart data rebuilds on every render, and React re-renders all consumers when `App` state changes.

---

## 4. Category Typos

### Compile-time Protection

```typescript
// types.ts:4
category: "food" | "transport" | "data" | "fun" | "other";

// types.ts:8
export type Category = Expense["category"];

// types.ts:14
export const CATEGORY_COLORS: Record<Category, string> = { ... };
```

TypeScript prevents:
- Passing `"groceries"` to any function expecting `Category`.
- Adding a new category to `CATEGORY_COLORS` without adding a color (or vice versa).
- Misspelling a category name in any `.tsx` file.

### Runtime Gaps

The `as T` cast in `useLocalStorage` (line 7) is erased at compile time. A user who manually edits `localStorage` can inject an expense with any category string:

```json
// localStorage manually edited
{"id":"x","amount":5,"category":"invalid-category","date":"2026-05-24"}
```

What happens downstream:

| Location | Behavior |
|----------|----------|
| `ExpenseForm` | Never reads from localStorage categories — always uses `<select>` from `CATEGORIES`. ❌ Only manually injected data. |
| `filterExpenses` | `e.category === cat` never matches. Expense survives filtering but gets no category aggregation. |
| `CategoryChart` | `CATEGORIES.map(...)` only iterates 5 valid categories. Invalid category amounts are **silently dropped** from the total. |
| `CategoryChart` Cell fill | `CATEGORY_COLORS[d.name.toLowerCase() as Category]` — safe here because `d.name` comes from `CATEGORIES`. |
| List item badge | `data-cat={e.category}` renders `"invalid-category"`. No CSS rule matches → badge has no background or color. |
| TotalSpend | Sums correctly because it operates on the whole expense object, not categories. ✅ |

**Risk**: An invalid category amount is visible in `TotalSpend` and the list but invisible in the pie chart. The numbers don't add up and the user has no way to tell why. A runtime schema validator (e.g. Zod) on `localStorage` reads would catch this.

---

## 5. Currency Assumptions

### Hardcoded `$` Symbol

Every formatted amount prepends `$` with no way to change it:

```
App.tsx:62              {e.amount.toFixed(2)}
TotalSpend.tsx:25       ${total.toFixed(2)}
CategoryChart.tsx:43    `$${Number(v).toFixed(2)}`
DailyChart.tsx:55       `$${Number(v).toFixed(2)}`
```

Four separate locations, four raw string interpolations. Changing the currency symbol means touching every one. No use of `Intl.NumberFormat` anywhere.

### Fixed Two Decimal Places

`Math.round(num * 100) / 100` in `ExpenseForm.tsx:20` and `.toFixed(2)` in every display location assume exactly two decimal places. This works for USD, EUR, GBP but fails for:

| Currency | Decimal Places | Problem |
|----------|---------------|---------|
| JPY, KRW | 0 | `toFixed(2)` shows `5.00` instead of `5` |
| KWD, BHD | 3 | `step="0.01"` prevents entering 0.001 |
| Cryptocurrencies | 8+ | Precision is lost entirely |

### Number Input Limitations

`ExpenseForm.tsx:33-41` has `<input type="number" step="0.01" min="0.01">`. The browser's native number input:
- Does not allow entering more than 2 decimal places (step enforcement).
- Shows up/down arrows (spinner) which can cause accidental value changes on scroll.
- `parseFloat` of `"0.01"` is fine, but `parseFloat("1e2")` returns `100` — scientific notation bypasses the numeric validation.

### toFixed Rounding Behavior

`Math.round(num * 100) / 100` uses "round half up" (school rounding). `toFixed` in some browsers uses "round half away from zero" (same result for positive numbers). Both are fine for USD but `toFixed` can produce surprising results for .5 in some edge cases (`1.005.toFixed(2)` → `"1.00"` in some engines due to IEEE 754).

### Locale Assumptions

`DailyChart.tsx:29` uses `"en"` locale hardcoded. A user with a non-English OS still sees `"Mon, May 18"`. No `navigator.language` detection.

---

## Summary of Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| localStorage corruption crashes app | High | Low | Add runtime validation (Zod / io-ts) |
| localStorage quota exceeded (silent data loss) | High | Low | Show user-facing warning |
| Category typo from localStorage injection | Medium | Very Low | Runtime validation on read |
| Chart data recomputation on every render | Medium | High at scale | `useMemo` in chart components |
| Hardcoded `$` and `en` locale | Low | High for non-US users | `Intl.NumberFormat` with `navigator.language` |
| 1,000+ item DOM list | Low | Low-Medium | Virtualization (react-window) |
| Scientific notation bypasses validation | Medium | Very Low | Reject non-finite / exponential input |
| Empty float handling (`parseFloat("")` → `NaN`) | Caught | Always | Guard on line 17 catches it ✅ |
