export const STORAGE_KEY = "plano_morar_sozinho_v1";
export type Expense = { id: string; label: string; value: number; min: number; max: number; step: number; custom?: boolean };
export const SOURCE_LABELS = { cash: "Dinheiro (CLT + autônomo)", clt: "Salário CLT", freelance: "Receita autônoma", vr: "VR" } as const;
export type FundingSource = keyof typeof SOURCE_LABELS;
export const isFundingSource = (value: unknown): value is FundingSource => typeof value === "string" && Object.hasOwn(SOURCE_LABELS, value);
export const fundingSource = (source: unknown): FundingSource => isFundingSource(source) ? source : "cash";
export type Category = { id: string; label: string; color: string; source: FundingSource; open: boolean; items: Expense[] };
export type MonthlyBudget = { income: number; freelanceIncome: number; vrIncome: number; categories: Category[] };
export type BudgetBook = { version: 3; selectedMonth: string; months: Record<string, MonthlyBudget> };
export const CATEGORY_COLORS = ["#2563eb", "#0d9488", "#f59e0b", "#a78bfa", "#f472b6", "#e8795b"];

export const INITIAL_BUDGET = {
  version: 1 as const,
  income: 1889,
  categories: [
    { id: "compromissos", label: "Faturas e Compromissos", color: "#2563eb", source: "cash", open: true, items: [
      { id: "cartoes", label: "Faturas de Cartão (C&A, BigPay, etc.)", value: 0, min: 0, max: 2000, step: 1 },
      { id: "ajuda_casa", label: "Ajuda de Casa / Dízimo / Fixos", value: 400, min: 0, max: 1500, step: 1 },
    ] },
    { id: "transporte_saude", label: "Transporte e Rotina", color: "#0d9488", source: "cash", open: true, items: [
      { id: "moto", label: "Combustível e Manutenção da Moto", value: 250, min: 0, max: 1000, step: 1 },
      { id: "academia_saude", label: "Academia e Cuidados Pessoais", value: 150, min: 0, max: 800, step: 1 },
    ] },
    { id: "pessoal", label: "Gastos Pessoais e Lazer", color: "#f59e0b", source: "cash", open: true, items: [
      { id: "alimentacao_lazer", label: "Alimentação fora e Saídas", value: 350, min: 0, max: 1500, step: 1 },
    ] },
  ] satisfies Category[],
};

export const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const cents = (value: number) => Math.round(value * 100);
export const categoryTotal = (category: Category) => category.items.reduce((sum, item) => sum + cents(item.value), 0) / 100;
export function totals(budget: MonthlyBudget) {
  const income = (cents(budget.income) + cents(budget.freelanceIncome)) / 100;
  const bySource: Record<FundingSource, number> = { cash: 0, clt: 0, freelance: 0, vr: 0 };
  for (const category of budget.categories) bySource[fundingSource(category.source)] += cents(categoryTotal(category));
  const expenses = (bySource.cash + bySource.clt + bySource.freelance) / 100;
  const remaining = (cents(income) - cents(expenses)) / 100;
  const vrExpenses = bySource.vr / 100;
  const vrRemaining = (cents(budget.vrIncome) - bySource.vr) / 100;
  return { income, expenses, remaining, rate: income > 0 ? remaining / income * 100 : null,
    vrIncome: budget.vrIncome, vrExpenses, vrRemaining, totalExpenses: (cents(expenses) + bySource.vr) / 100,
    cltExpenses: bySource.clt / 100, freelanceExpenses: bySource.freelance / 100 };
}
export function currentMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
export const isMonth = (value: unknown): value is string => typeof value === "string" && /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(value);
export function createMonthlyBudget(template?: MonthlyBudget): MonthlyBudget {
  return { income: template?.income ?? INITIAL_BUDGET.income, freelanceIncome: 0, vrIncome: template?.vrIncome ?? 0, categories: structuredClone(template?.categories ?? INITIAL_BUDGET.categories) };
}
export function createBudgetBook(month: string): BudgetBook {
  if (!isMonth(month)) throw new Error("Mês inválido.");
  return { version: 3, selectedMonth: month, months: { [month]: createMonthlyBudget() } };
}
export function selectMonth(book: BudgetBook, month: string): BudgetBook {
  if (!isMonth(month)) throw new Error("Mês inválido.");
  return { ...book, selectedMonth: month, months: book.months[month] ? book.months : { ...book.months, [month]: createMonthlyBudget(book.months[book.selectedMonth]) } };
}

const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const amount = (value: unknown, maximum: number): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= maximum;
const identifier = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
const label = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0 && value.trim().length <= 80;
const invalid = (): never => { throw new Error("Arquivo incompatível. Importe um JSON exportado por este aplicativo."); };

function parseMonthlyBudget(data: unknown, version: 1 | 2 | 3): MonthlyBudget {
  if (!record(data) || !amount(data.income, 1_000_000_000) || (version !== 1 && !amount(data.freelanceIncome, 1_000_000_000)) || (version === 3 && !amount(data.vrIncome, 1_000_000_000)) || !Array.isArray(data.categories) || data.categories.length > 50) return invalid();
  const categoryIds = new Set<string>();
  const accountIds = new Set<string>();
  const categories = data.categories.map((category: unknown): Category => {
    if (!record(category) || !identifier(category.id) || categoryIds.has(category.id) || !label(category.label) || typeof category.color !== "string" || !/^#[\da-fA-F]{6}$/.test(category.color) || typeof category.open !== "boolean" || !Array.isArray(category.items) || category.items.length > 100) return invalid();
    const source = category.source == null || category.source === "" ? "cash" : category.source;
    if (!isFundingSource(source)) return invalid();
    categoryIds.add(category.id);
    const items = category.items.map((item: unknown): Expense => {
      if (!record(item) || !identifier(item.id) || accountIds.has(item.id) || !label(item.label) || !amount(item.max, 10_000_000) || item.max < 1 || !Number.isInteger(item.max) || !amount(item.value, item.max) || item.min !== 0 || item.step !== 1 || (item.custom !== undefined && typeof item.custom !== "boolean")) return invalid();
      accountIds.add(item.id);
      return { id: item.id, label: item.label.trim(), value: cents(item.value) / 100, min: 0, max: item.max, step: 1, ...(item.custom !== undefined ? { custom: item.custom } : {}) };
    });
    return { id: category.id, label: category.label.trim(), color: category.color, source, open: category.open, items };
  });
  return { income: cents(data.income) / 100, freelanceIncome: version === 1 ? 0 : cents(data.freelanceIncome as number) / 100, vrIncome: version < 3 ? 0 : cents(data.vrIncome as number) / 100, categories };
}

export function parseBudget(text: string, legacyMonth = currentMonth()): BudgetBook {
  const data: unknown = JSON.parse(text);
  if (!record(data)) return invalid();
  if (data.version === 1) {
    if (!isMonth(legacyMonth)) return invalid();
    return { version: 3, selectedMonth: legacyMonth, months: { [legacyMonth]: parseMonthlyBudget(data, 1) } };
  }
  if ((data.version !== 2 && data.version !== 3) || !isMonth(data.selectedMonth) || !record(data.months)) return invalid();
  const entries = Object.entries(data.months);
  if (entries.length === 0 || entries.length > 1200 || !Object.hasOwn(data.months, data.selectedMonth)) return invalid();
  const months: Record<string, MonthlyBudget> = {};
  for (const [month, budget] of entries) {
    if (!isMonth(month)) return invalid();
    months[month] = parseMonthlyBudget(budget, data.version);
  }
  return { version: 3, selectedMonth: data.selectedMonth, months };
}
