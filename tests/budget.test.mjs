import assert from "node:assert/strict";
import { test } from "node:test";
import { INITIAL_BUDGET, createBudgetBook, createMonthlyBudget, currentMonth, parseBudget, selectMonth, totals } from "../src/lib/budget.ts";

test("CLT + freelance totals, deficit, zero income and cents", () => {
  const budget = createMonthlyBudget();
  const { income, expenses, remaining, rate } = totals(budget);
  assert.deepEqual({ income, expenses, remaining, rate }, { income: 1889, expenses: 1150, remaining: 739, rate: 739 / 1889 * 100 });
  budget.freelanceIncome = 500;
  assert.equal(totals(budget).remaining, 1239);
  assert.equal(totals(budget).income, 2389);
  budget.income = 0; budget.freelanceIncome = 0;
  assert.equal(totals(budget).rate, null);
  assert.equal(totals(budget).remaining, -1150);
  budget.income = 1150.01;
  assert.equal(totals(budget).remaining, .01);
});

test("months preserve independent income, accounts and categories across year boundaries", () => {
  let book = createBudgetBook("2026-12");
  book.months["2026-12"].income = 2200;
  book.months["2026-12"].freelanceIncome = 300;
  book.months["2026-12"].categories.push({ id: "category-work", label: "Trabalho", color: "#a78bfa", source: "cash", open: true, items: [{ id: "custom-vps", label: "VPS", value: 150, min: 0, max: 2000, step: 1, custom: true }] });
  book = selectMonth(book, "2027-01");
  assert.equal(book.months["2027-01"].income, 2200);
  assert.equal(book.months["2027-01"].freelanceIncome, 0);
  assert.equal(book.months["2027-01"].categories.at(-1).items[0].value, 150);
  book.months["2027-01"].income = 1900;
  book.months["2027-01"].categories.at(-1).items[0].value = 200;
  book.months["2027-01"].categories.at(-1).label = "Serviços";
  book = selectMonth(book, "2026-12");
  assert.equal(book.months["2026-12"].income, 2200);
  assert.equal(book.months["2026-12"].freelanceIncome, 300);
  assert.equal(book.months["2026-12"].categories.at(-1).items[0].value, 150);
  assert.equal(book.months["2026-12"].categories.at(-1).label, "Trabalho");
  assert.deepEqual(parseBudget(JSON.stringify(book)), book);
  assert.equal(currentMonth(new Date(2026, 11, 31, 23, 59)), "2026-12");
});

test("migrates existing single-month backups without losing accounts or totals", () => {
  const legacy = structuredClone(INITIAL_BUDGET);
  legacy.categories[0].open = false;
  legacy.categories[0].items.push({ id: "custom-test", label: "Comida extra", value: 150, min: 0, max: 2000, step: 1, custom: true });
  const migrated = parseBudget(JSON.stringify(legacy), "2026-11");
  assert.equal(migrated.version, 3);
  assert.equal(migrated.selectedMonth, "2026-11");
  assert.deepEqual(migrated.months["2026-11"].categories, legacy.categories);
  assert.equal(totals(migrated.months["2026-11"]).remaining, 589);
  assert.equal(migrated.months["2026-11"].freelanceIncome, 0);
});

test("accepts empty new categories and rejects invalid monthly backups", () => {
  const book = createBudgetBook("2026-11");
  book.months["2026-11"].categories.push({ id: "category-new", label: "Saúde", color: "#f472b6", source: "cash", open: true, items: [] });
  assert.deepEqual(parseBudget(JSON.stringify(book)), book);
  for (const value of [null, {}, { ...book, selectedMonth: "2026-13" }, { ...book, selectedMonth: "2027-01" }, { ...book, months: {} }]) assert.throws(() => parseBudget(JSON.stringify(value)));
  assert.throws(() => parseBudget("{broken"));
  assert.throws(() => selectMonth(book, "2026-00"));
  const invalid = structuredClone(book);
  invalid.months["2026-11"].freelanceIncome = -1;
  assert.throws(() => parseBudget(JSON.stringify(invalid)));
  invalid.months["2026-11"].freelanceIncome = 0;
  invalid.months["2026-11"].categories[0].items[0].value = 2001;
  assert.throws(() => parseBudget(JSON.stringify(invalid)));
  invalid.months["2026-11"].categories[0].items[0].value = 0;
  invalid.months["2026-11"].categories[0].items.push({ ...invalid.months["2026-11"].categories[0].items[0] });
  assert.throws(() => parseBudget(JSON.stringify(invalid)));
  invalid.months["2026-11"].categories[0].items.pop();
  invalid.months["2026-11"].categories.at(-1).color = "url(javascript:bad)";
  assert.throws(() => parseBudget(JSON.stringify(invalid)));
});

test("deleted initial accounts and empty months survive backup without changing another month", () => {
  let book = createBudgetBook("2026-11");
  book = selectMonth(book, "2026-12");
  book.months["2026-11"].categories[1].items = book.months["2026-11"].categories[1].items.filter(item => item.id !== "academia_saude");
  assert.equal(totals(book.months["2026-11"]).expenses, 1000);
  assert.equal(totals(book.months["2026-12"]).expenses, 1150);
  book.months["2026-11"].categories = [];
  const imported = parseBudget(JSON.stringify(book));
  assert.equal(totals(imported.months["2026-11"]).expenses, 0);
  assert.equal(imported.months["2026-12"].categories[1].items[1].id, "academia_saude");
});


test("VR is separate from cash savings and deficits do not silently use cash", () => {
  const budget = createMonthlyBudget();
  budget.vrIncome = 700;
  assert.equal(totals(budget).remaining, 739);
  assert.equal(totals(budget).vrRemaining, 700);
  assert.equal(totals(budget).rate, 739 / 1889 * 100);
  budget.categories[2].source = "vr";
  let result = totals(budget);
  assert.equal(result.expenses, 800);
  assert.equal(result.vrExpenses, 350);
  assert.equal(result.totalExpenses, 1150);
  assert.equal(result.vrRemaining, 350);
  assert.equal(result.remaining, 1089);
  budget.vrIncome = 200;
  result = totals(budget);
  assert.equal(result.vrRemaining, -150);
  assert.equal(result.remaining, 1089);
  budget.categories[0].source = "clt";
  budget.categories[1].source = "freelance";
  result = totals(budget);
  assert.equal(result.cltExpenses, 400);
  assert.equal(result.freelanceExpenses, 400);
  assert.equal(result.expenses + result.vrExpenses, result.totalExpenses);
  budget.income = 0; budget.freelanceIncome = 0;
  assert.equal(totals(budget).rate, null);
});

test("monthly VR receipts and payment sources persist and old v2 books migrate", () => {
  let book = createBudgetBook("2026-11");
  book.months["2026-11"].vrIncome = 600;
  book.months["2026-11"].categories[2].source = "vr";
  book = selectMonth(book, "2026-12");
  assert.equal(book.months["2026-12"].vrIncome, 600);
  assert.equal(book.months["2026-12"].categories[2].source, "vr");
  book.months["2026-12"].vrIncome = 300;
  book.months["2026-12"].categories[2].source = "clt";
  assert.equal(book.months["2026-11"].categories[2].source, "vr");
  assert.deepEqual(parseBudget(JSON.stringify(book)), book);
  const legacy = structuredClone(book);
  legacy.version = 2;
  for (const month of Object.values(legacy.months)) {
    delete month.vrIncome;
    for (const category of month.categories) delete category.source;
  }
  const migrated = parseBudget(JSON.stringify(legacy));
  assert.equal(migrated.version, 3);
  assert.equal(migrated.months["2026-11"].vrIncome, 0);
  assert.equal(migrated.months["2026-11"].categories[2].source, "cash");
  assert.equal(totals(migrated.months["2026-11"]).remaining, 739);
});

test("reject invalid VR amounts and payment sources in new backups", () => {
  const book = createBudgetBook("2026-11");
  book.months["2026-11"].vrIncome = -1;
  assert.throws(() => parseBudget(JSON.stringify(book)));
  book.months["2026-11"].vrIncome = 500;
  book.months["2026-11"].categories[0].source = "toString";
  assert.throws(() => parseBudget(JSON.stringify(book)));
  book.months["2026-11"].categories[0].source = "invalid-source";
  assert.throws(() => parseBudget(JSON.stringify(book)));
});

test("regression: unassigned category from existing data must not disappear from expenses", () => {
  const budget = createMonthlyBudget();
  budget.vrIncome = 400;
  budget.categories[0].items[0].value = 1781.98;
  budget.categories[0].items[1].value = 0;
  delete budget.categories[0].source;
  budget.categories[1].items[0].value = 100;
  budget.categories[1].items[1].value = 0;
  budget.categories[2].source = "vr";
  budget.categories[2].items[0].value = 400;
  const result = totals(budget);
  assert.equal(result.expenses, 1881.98);
  assert.equal(result.remaining, 7.02);
  assert.equal(result.vrRemaining, 0);
  assert.equal(result.totalExpenses, 2281.98);
  const restored = parseBudget(JSON.stringify({ version: 3, selectedMonth: "2026-11", months: { "2026-11": budget } }));
  assert.equal(restored.months["2026-11"].categories[0].source, "cash");
  assert.equal(restored.months["2026-11"].categories[0].items[0].value, 1781.98);
  assert.equal(totals(restored.months["2026-11"]).remaining, 7.02);
});
