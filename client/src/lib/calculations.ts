// كل الحسابات المالية — مطابقة حرفياً لصيغ الإكسل
import { FinanceState, GroupKey, LineItem, MONTHS } from "./financeData";

export const CURRENCY = "﷼";

export function fmt(n: number): string {
  const rounded = Math.round(n);
  return rounded.toLocaleString("en-US");
}

export function fmtCurrency(n: number): string {
  return `${fmt(n)} ${CURRENCY}`;
}

export function fmtPercent(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function itemsByGroup(state: FinanceState, group: GroupKey): LineItem[] {
  return state.items.filter((i) => i.group === group);
}

// مجموع مجموعة في شهر معيّن
export function groupTotal(state: FinanceState, group: GroupKey, month: number): number {
  return itemsByGroup(state, group).reduce((s, i) => s + (i.monthly[month] || 0), 0);
}

export function groupTargetTotal(state: FinanceState, group: GroupKey): number {
  return itemsByGroup(state, group).reduce((s, i) => s + (i.target || 0), 0);
}

// === ملخص شهر واحد (يطابق الداشبورد) ===
export interface MonthSummary {
  month: number;
  income: number; // إجمالي الدخل = D15
  fixed: number; // الفواتير الثابتة = I17
  debt: number; // الالتزامات = D27
  variable: number; // المصاريف المتغيرة = I28
  savings: number; // الادخار = D37
  expenses: number; // إجمالي المصروفات = I17 + I28 + D27
  net: number; // صافي السيولة = الدخل - المصروفات - الادخار
  savingRate: number; // نسبة الادخار = الادخار / الدخل
}

export function monthSummary(state: FinanceState, month: number): MonthSummary {
  const income = groupTotal(state, "income", month);
  const fixed = groupTotal(state, "fixed", month);
  const debt = groupTotal(state, "debt", month);
  const variable = groupTotal(state, "variable", month);
  const savings = groupTotal(state, "savings", month);
  const expenses = fixed + debt + variable;
  const net = income - expenses - savings;
  const savingRate = income === 0 ? 0 : savings / income;
  return { month, income, fixed, debt, variable, savings, expenses, net, savingRate };
}

export function allMonthSummaries(state: FinanceState): MonthSummary[] {
  return MONTHS.map((_, i) => monthSummary(state, i));
}

// === الملخص السنوي ===
export interface YearSummary {
  totalIncome: number;
  totalExpenses: number;
  totalNet: number;
  totalSavings: number;
  savingRate: number;
  surplusRate: number;
  avgMonthlyExpense: number;
}

export function yearSummary(state: FinanceState): YearSummary {
  const sums = allMonthSummaries(state);
  const totalIncome = sums.reduce((s, x) => s + x.income, 0);
  const totalExpenses = sums.reduce((s, x) => s + x.expenses, 0);
  const totalNet = sums.reduce((s, x) => s + x.net, 0);
  const totalSavings = sums.reduce((s, x) => s + x.savings, 0);
  const monthsWithExpense = sums.filter((x) => x.expenses > 0);
  const avgMonthlyExpense =
    monthsWithExpense.length === 0
      ? 0
      : monthsWithExpense.reduce((s, x) => s + x.expenses, 0) / monthsWithExpense.length;
  return {
    totalIncome,
    totalExpenses,
    totalNet,
    totalSavings,
    savingRate: totalIncome === 0 ? 0 : totalSavings / totalIncome,
    surplusRate: totalIncome === 0 ? 0 : totalNet / totalIncome,
    avgMonthlyExpense,
  };
}

// === مؤشر 50/30/20 (سنوي) ===
export interface Rule503020 {
  needs: number; // الاحتياجات
  wants: number; // الكماليات
  savings: number;
  income: number;
  needsRate: number;
  wantsRate: number;
  savingsRate: number;
  needsOk: boolean;
  wantsOk: boolean;
  savingsOk: boolean;
  overall: "excellent" | "good" | "attention" | "none";
}

function sumItemsYear(state: FinanceState, ids: string[]): number {
  return state.items
    .filter((i) => ids.includes(i.id))
    .reduce((s, i) => s + i.monthly.reduce((a, b) => a + b, 0), 0);
}

export function rule503020(state: FinanceState): Rule503020 {
  // الاحتياجات: كل الفواتير الثابتة + كل الديون + مقاضي + بنزين + صيدلية
  const income = sumItemsYear(state, ["salary", "freelance", "invest_income", "extra_income"]);
  const fixedIds = ["electricity", "water", "phone_internet", "subscriptions", "rent", "other_bill"];
  const debtIds = ["mortgage", "car_loan", "credit_card", "bnpl", "personal_loan", "other_debt"];
  const needsVarIds = ["groceries", "fuel", "pharmacy", "housekeeper_salary"];
  const needs = sumItemsYear(state, [...fixedIds, ...debtIds, ...needsVarIds]);
  // الكماليات: توصيل + مطاعم + عزايم + مصاريف أخرى
  // (الصدقة لا تُحسب هنا عمداً — عطاء اختياري، لا تصنّف كـ"حاجة" ولا "كماليّة")
  const wants = sumItemsYear(state, ["delivery", "dining", "hosting", "other_var"]);
  const savings = sumItemsYear(state, ["emergency", "travel", "wedding", "other_saving"]);

  const needsRate = income === 0 ? 0 : needs / income;
  const wantsRate = income === 0 ? 0 : wants / income;
  const savingsRate = income === 0 ? 0 : savings / income;

  let overall: Rule503020["overall"] = "none";
  if (income > 0) {
    if (savingsRate >= 0.2 && needsRate <= 0.5) overall = "excellent";
    else if (savingsRate >= 0.1) overall = "good";
    else overall = "attention";
  }

  return {
    needs,
    wants,
    savings,
    income,
    needsRate,
    wantsRate,
    savingsRate,
    needsOk: needsRate <= 0.5,
    wantsOk: wantsRate <= 0.3,
    savingsOk: savingsRate >= 0.2,
    overall,
  };
}

// === صندوق الطوارئ ===
export interface EmergencyFund {
  balance: number; // مجموع ادخار الطوارئ السنوي
  avgMonthlyExpense: number;
  coverMonths: number;
  status: "excellent" | "good" | "attention" | "none";
}

export function emergencyFund(state: FinanceState): EmergencyFund {
  const balance = sumItemsYear(state, ["emergency"]);
  const ys = yearSummary(state);
  const avg = ys.avgMonthlyExpense;
  const coverMonths = avg === 0 ? 0 : balance / avg;
  let status: EmergencyFund["status"] = "none";
  if (avg > 0) {
    if (coverMonths >= 6) status = "excellent";
    else if (coverMonths >= 3) status = "good";
    else status = "attention";
  }
  return { balance, avgMonthlyExpense: avg, coverMonths, status };
}

// === أعلى مصروف في الشهر ===
export interface TopExpense {
  name: string;
  amount: number;
}

export function topExpense(state: FinanceState, month: number): TopExpense {
  const expenseItems = state.items.filter(
    (i) => i.group === "fixed" || i.group === "debt" || i.group === "variable",
  );
  let top: TopExpense = { name: "—", amount: 0 };
  for (const i of expenseItems) {
    const v = i.monthly[month] || 0;
    if (v > top.amount) top = { name: i.name, amount: v };
  }
  return top;
}

// === أعلى مصروف سنوي ===
export function topExpenseYear(state: FinanceState): TopExpense {
  const expenseItems = state.items.filter(
    (i) => i.group === "fixed" || i.group === "debt" || i.group === "variable",
  );
  let top: TopExpense = { name: "—", amount: 0 };
  for (const i of expenseItems) {
    const v = i.monthly.reduce((a, b) => a + b, 0);
    if (v > top.amount) top = { name: i.name, amount: v };
  }
  return top;
}

// === عدد البنود الأساسية بدون دفعة مسجّلة ===
export function unpaidEssentials(state: FinanceState, month: number): number {
  // فواتير ثابتة لها هدف>0 وفعلي=0، + ديون لها هدف>0 وفعلي=0
  const checkIds = [
    "electricity",
    "water",
    "phone_internet",
    "subscriptions",
    "rent",
    "mortgage",
    "car_loan",
    "credit_card",
    "bnpl",
    "personal_loan",
  ];
  let count = 0;
  for (const i of state.items) {
    if (checkIds.includes(i.id) && i.target > 0 && (i.monthly[month] || 0) === 0) count++;
  }
  return count;
}

// تقييم بند واحد مقارنة بالهدف
export function evaluateItem(
  item: LineItem,
  month: number,
  evaluation: "higher_better" | "reach_target" | "lower_better",
): "good" | "bad" | "neutral" {
  const actual = item.monthly[month] || 0;
  const target = item.target || 0;
  if (target === 0 && actual === 0) return "neutral";
  if (evaluation === "higher_better" || evaluation === "reach_target") {
    return actual >= target ? "good" : "bad";
  }
  // lower_better
  return actual <= target ? "good" : "bad";
}
