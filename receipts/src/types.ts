export interface Expense {
  id: string;
  amount: number;
  category: "food" | "transport" | "data" | "fun" | "other";
  date: string;
}

export type Category = Expense["category"];

export type FilterPeriod = "this-week" | "last-week" | "all-time";

export const CATEGORIES: Category[] = ["food", "transport", "data", "fun", "other"];

export const CATEGORY_COLORS: Record<Category, string> = {
  food: "#EF4444",
  transport: "#3B82F6",
  data: "#8B5CF6",
  fun: "#F59E0B",
  other: "#6B7280",
};
