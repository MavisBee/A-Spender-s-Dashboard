import { randomUUID } from "crypto";

const CATEGORIES = ["food", "transport", "data", "fun", "other"];

function randomAmount(min = 3, max = 150) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randomCategory() {
  return CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
}

function randomDate(start, end) {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().split("T")[0];
}

const expenses = [];

// 15 this week: May 18-24
for (let i = 0; i < 15; i++) {
  expenses.push({
    id: randomUUID(),
    amount: randomAmount(),
    category: randomCategory(),
    date: randomDate(new Date("2026-05-18"), new Date("2026-05-24")),
  });
}

// 15 last week: May 11-17
for (let i = 0; i < 15; i++) {
  expenses.push({
    id: randomUUID(),
    amount: randomAmount(),
    category: randomCategory(),
    date: randomDate(new Date("2026-05-11"), new Date("2026-05-17")),
  });
}

// 20 older: Apr 1 - May 10
for (let i = 0; i < 20; i++) {
  expenses.push({
    id: randomUUID(),
    amount: randomAmount(),
    category: randomCategory(),
    date: randomDate(new Date("2026-04-01"), new Date("2026-05-10")),
  });
}

process.stdout.write(JSON.stringify(expenses, null, 2));
