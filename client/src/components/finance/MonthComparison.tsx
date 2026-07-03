// مقارنة مصروفات الشهر الحالي مع الشهر السابق — رسم بياني شريطي يوضّح الفروقات
import { useState } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { MONTHS, GROUPS } from "@/lib/financeData";
import { groupTotal, monthSummary, fmt, fmtCurrency } from "@/lib/calculations";
import { Riyal } from "@/components/finance/Bits";
import { ArrowLeftRight, TrendingUp, TrendingDown, Minus, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";

// مجموعات المصروفات فقط (نستثني الدخل) + إجمالي المصروفات
const EXPENSE_GROUPS = GROUPS.filter(
  (g) => g.key === "fixed" || g.key === "debt" || g.key === "variable",
);

export function MonthComparison() {
  const { state } = useFinance();
  const current = state.currentMonth;
  const previous = (current - 1 + 12) % 12;
  const [showItems, setShowItems] = useState(false);

  const curS = monthSummary(state, current);
  const prevS = monthSummary(state, previous);

  // بيانات المجموعات للرسم الشريطي
  const groupData = EXPENSE_GROUPS.map((g) => ({
    name: g.title,
    [MONTHS[previous]]: groupTotal(state, g.key, previous),
    [MONTHS[current]]: groupTotal(state, g.key, current),
    prev: groupTotal(state, g.key, previous),
    cur: groupTotal(state, g.key, current),
  }));

  // صف إجمالي المصروفات
  const totalRow = {
    name: "إجمالي المصروفات",
    [MONTHS[previous]]: prevS.expenses,
    [MONTHS[current]]: curS.expenses,
    prev: prevS.expenses,
    cur: curS.expenses,
  };

  const chartData = [...groupData, totalRow];

  const diff = curS.expenses - prevS.expenses;
  const diffPct = prevS.expenses === 0 ? 0 : (diff / prevS.expenses) * 100;

  // فروقات البنود الفردية (للمصروفات فقط)
  const itemDiffs = state.items
    .filter((i) => i.group === "fixed" || i.group === "debt" || i.group === "variable")
    .map((i) => ({
      name: i.name,
      prev: i.monthly[previous] || 0,
      cur: i.monthly[current] || 0,
      diff: (i.monthly[current] || 0) - (i.monthly[previous] || 0),
    }))
    .filter((d) => d.prev !== 0 || d.cur !== 0)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  const PREV_COLOR = "oklch(0.72 0.1 80)"; // ذهبي للشهر السابق
  const CUR_COLOR = "var(--olive)"; // أخضر للشهر الحالي

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ArrowLeftRight className="h-4 w-4" />
        </span>
        <div className="leading-tight">
          <h3 className="font-display text-sm font-bold">مقارنة المصروفات بالشهر السابق</h3>
          <p className="text-[11px] text-muted-foreground">
            {MONTHS[previous]} مقابل {MONTHS[current]}
          </p>
        </div>
      </div>

      {/* ملخص الفرق الكلي */}
      <div
        className="mt-3 flex items-center justify-between rounded-xl px-3 py-2.5"
        style={{
          background:
            diff > 0
              ? "color-mix(in oklch, var(--destructive) 10%, transparent)"
              : diff < 0
                ? "color-mix(in oklch, var(--positive) 12%, transparent)"
                : "var(--muted)",
        }}
      >
        <div className="flex items-center gap-2">
          {diff > 0 ? (
            <TrendingUp className="h-4 w-4 text-destructive" />
          ) : diff < 0 ? (
            <TrendingDown className="h-4 w-4 text-positive" />
          ) : (
            <Minus className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">
            {diff > 0 ? "ارتفعت مصروفاتك" : diff < 0 ? "انخفضت مصروفاتك" : "لا تغيير"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className={cn(
              "font-display text-base font-extrabold tabular",
              diff > 0 ? "text-destructive" : diff < 0 ? "text-positive" : "text-muted-foreground",
            )}
          >
            {diff > 0 ? "+" : diff < 0 ? "−" : ""}
            {fmt(Math.abs(diff))}
          </span>
          <Riyal className="text-xs" />
          {prevS.expenses > 0 && (
            <span
              className={cn(
                "mr-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular",
                diff > 0
                  ? "bg-destructive/15 text-destructive"
                  : diff < 0
                    ? "bg-positive/15 text-positive"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {diff > 0 ? "+" : ""}
              {Math.round(diffPct)}%
            </span>
          )}
        </div>
      </div>

      {/* الرسم الشريطي المجمّع */}
      <div className="mt-4 h-64" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }} barGap={4}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9, fontFamily: "var(--font-sans)", fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={0}
              height={40}
            />
            <YAxis
              tick={{ fontSize: 9, fontFamily: "var(--font-sans)", fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={36}
              tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : `${v}`)}
            />
            <Tooltip
              formatter={(v: number) => fmtCurrency(v)}
              cursor={{ fill: "var(--muted)" }}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--card)",
                fontSize: 12,
                fontFamily: "var(--font-sans)",
                direction: "rtl",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-sans)", paddingTop: 4 }}
            />
            <Bar dataKey={MONTHS[previous]} fill={PREV_COLOR} radius={[4, 4, 0, 0]} />
            <Bar dataKey={MONTHS[current]} fill={CUR_COLOR} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* تفصيل البنود */}
      <button
        onClick={() => setShowItems((v) => !v)}
        className="btn-press mt-2 flex w-full items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5 text-sm font-medium hover:bg-muted/60"
      >
        <span>تفاصيل الفروقات لكل بند</span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform duration-200", showItems && "rotate-180")}
        />
      </button>

      {showItems && (
        <div className="mt-2 space-y-1">
          {itemDiffs.length === 0 && (
            <p className="py-3 text-center text-sm text-muted-foreground">
              لا توجد مصروفات مسجّلة في الشهرين للمقارنة.
            </p>
          )}
          {itemDiffs.map((d) => (
            <div
              key={d.name}
              className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-muted/40"
            >
              <span className="flex-1 truncate">{d.name}</span>
              <div className="flex items-center gap-2">
                <span className="tabular text-[11px] text-muted-foreground">
                  {fmt(d.prev)} ← {fmt(d.cur)}
                </span>
                <span
                  className={cn(
                    "inline-flex w-16 items-center justify-end gap-0.5 tabular text-xs font-bold",
                    d.diff > 0
                      ? "text-destructive"
                      : d.diff < 0
                        ? "text-positive"
                        : "text-muted-foreground",
                  )}
                >
                  {d.diff > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : d.diff < 0 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  {d.diff > 0 ? "+" : d.diff < 0 ? "−" : ""}
                  {fmt(Math.abs(d.diff))}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
