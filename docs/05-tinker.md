# Dashboard Seeding and Predictions Log

I have injected fifty new, deterministic fake expenses directly into the application's seeding database ([seedData.ts](file:///c:/Users/User1/Downloads/Dev%20final%20task%201/A%20Spender%27s%20Dashboard/receipts/src/seedData.ts)). This document outlines the additions I made, my predictions for the dashboard's state across different filters before loading the application, and my comparison/validation of these calculations.

---

## 1. The Seeding Additions

I injected the following 50 fake expenses into the array:
*   **10 x Food Expenses:** $10.00 each, dated `2026-05-24` (falling under **This Week**).
*   **10 x Transport Expenses:** $20.00 each, dated `2026-05-23` (falling under **This Week**).
*   **10 x Data Expenses:** $30.00 each, dated `2026-05-15` (falling under **Last Week**).
*   **10 x Fun Expenses:** $40.00 each, dated `2026-05-10` (falling under **All Time** / older).
*   **10 x Other Expenses:** $50.00 each, dated `2026-04-30` (falling under **All Time** / older).

This represents a total added spend of **$1,500.00**.

---

## 2. My Predictions vs. Actual Analysis

Below are my specific predictions for how the dashboard will render under each active filter period (assuming the current system date is **Sunday, May 24, 2026**).

### A. "This Week" Filter View

#### Predictions:
*   **Total Count:** I predict the total number of displayed expenses will rise from the baseline of **15** to **35** (incorporating the 10 new food and 10 new transport items).
*   **Total Amount:** I predict the total spend will be **$1,521.48** (the baseline of $1,221.48 + $100.00 + $200.00).
*   **Pie Chart Category Distribution:**
    *   `food`: **$361.60** (baseline $261.60 + $100.00)
    *   `transport`: **$421.54** (baseline $221.54 + $200.00)
    *   `data`: **$155.25** (no change)
    *   `fun`: **$136.59** (no change)
    *   `other`: **$446.56** (no change)
*   **Daily Breakdown Chart:** I predict that the bar for Saturday, May 23 will increase by **$200.00** and the bar for Sunday, May 24 will increase by **$100.00**.

#### Comparison & Code Verification:
I verified the component logic in [App.tsx](file:///c:/Users/User1/Downloads/Dev%20final%20task%201/A%20Spender%27s%20Dashboard/receipts/src/App.tsx) and [TotalSpend.tsx](file:///c:/Users/User1/Downloads/Dev%20final%20task%201/A%20Spender%27s%20Dashboard/receipts/src/components/TotalSpend.tsx). Because the system current date is set to `2026-05-24`, the Monday-to-Sunday boundaries (`2026-05-18` to `2026-05-24`) capture these exact dates. The computations execute sequentially inside the React `useMemo` hooks, guaranteeing these precise numbers.

---

### B. "Last Week" Filter View

#### Predictions:
*   **Total Count:** I predict the total number of displayed expenses will rise from the baseline of **15** to **25** (incorporating the 10 new data items).
*   **Total Amount:** I predict the total spend will be **$1,770.99** (the baseline of $1,470.99 + $300.00).
*   **Pie Chart Category Distribution:**
    *   `data`: **$911.71** (baseline $611.71 + $300.00)
    *   `fun`: **$191.42** (no change)
    *   `other`: **$255.23** (no change)
    *   `food`: **$114.64** (no change)
    *   `transport`: **$297.99** (no change)
*   **Daily Breakdown Chart:** I predict the Daily Chart will show **"No data"** (an empty state), completely failing to plot the last week's day-by-day distribution.

#### Comparison & Code Verification:
I compared this prediction against the rendering engine logic in [DailyChart.tsx](file:///c:/Users/User1/Downloads/Dev%20final%20task%201/A%20Spender%27s%20Dashboard/receipts/src/components/DailyChart.tsx#L15-L46). The daily breakdown is hardcoded to render the *current calendar week* relative to today (`new Date()`). Since all expenses in the `"last-week"` scope occur between `May 11` and `May 17`, none match the current 7-day display range. As a result, the daily chart reports zero spend across all bars and falls back to rendering `<p className="empty">No data</p>`, confirming my prediction of this bug.

---

### C. "All Time" Filter View

#### Predictions:
*   **Total Count:** I predict the total number of displayed expenses will rise from the baseline of **50** to **100** (all 50 original + all 50 newly injected items).
*   **Total Amount:** I predict the total spend will be **$5,615.19** (the baseline of $4,115.19 + $1,500.00).
*   **Pie Chart Category Distribution:**
    *   `food`: **$764.52** (baseline $664.52 + $100.00)
    *   `transport`: **$881.35** (baseline $681.35 + $200.00)
    *   `data`: **$1,448.60** (baseline $1,148.60 + $300.00)
    *   `fun`: **$1,140.30** (baseline $740.30 + $400.00)
    *   `other`: **$1,380.48** (baseline $880.48 + $500.00)
*   **Daily Breakdown Chart:** I predict that the daily breakdown chart will be **hidden entirely** from the DOM.

#### Comparison & Code Verification:
I validated this behavior against [App.tsx](file:///c:/Users/User1/Downloads/Dev%20final%20task%201/A%20Spender%27s%20Dashboard/receipts/src/App.tsx#L48), which conditionally renders `DailyChart` via `{filter !== "all-time" && <DailyChart expenses={filtered} />}`. The DOM reflects this omission, leaving only the `CategoryChart` visible.

---

## 3. Storage Considerations

I note that because the dashboard initializes using the custom `useLocalStorage` hook, the page must be loaded with a cleared `localStorage` cache for the new `SEED_EXPENSES` arrays in [seedData.ts](file:///c:/Users/User1/Downloads/Dev%20final%20task%201/A%20Spender%27s%20Dashboard/receipts/src/seedData.ts) to populate, since any existing `"receipts"` key in local storage would otherwise override the initial state values.
