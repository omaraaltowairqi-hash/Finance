// تصميم: الدفتر الهادئ — أرقام بارزة، خلفية عاجية، أخضر زيتوني + تيراكوتا للعجز
import { useFinance } from "@/contexts/FinanceContext";
import {
  monthSummary,
  topExpense,
  unpaidEssentials,
  fmt,
  fmtCurrency,
  fmtPercent,
  groupTotal,
} from "@/lib/calculations";
import { MONTHS } from "@/lib/financeData";
import { BrandHeader, PageShell } from "@/components/finance/AppLayout";
import { MonthPicker } from "@/components/finance/MonthPicker";
import { AnimatedNumber, Riyal, ThinBar } from "@/components/finance/Bits";
import { MonthComparison } from "@/components/finance/MonthComparison";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ArrowDownCircle,
  AlertTriangle,
  CheckCircle2,
  Flame,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
} from "recharts";

const HERO = "./assets/hero-texture.png";

export default function Dashboard() {
  const { state } = useFinance();
  const month = state.currentMonth;
  const s = monthSummary(state, month);
  const top = topExpense(state, month);
  const unpaid = unpaidEssentials(state, month);
  const surplus = s.net >= 0;

  const breakdown = [
    { name: "فواتير ثابتة", value: groupTotal(state, "fixed", month), color: "var(--olive)" },
    { name: "التزامات وديون", value: groupTotal(state, "debt", month), color: "var(--terracotta)" },
    { name: "مصاريف متغيرة", value: groupTotal(state, "variable", month), color: "var(--gold)" },
    { name: "ادخار", value: groupTotal(state, "savings", month), color: "oklch(0.55 0.05 200)" },
  ].filter((d) => d.value > 0);

  // اتجاه آخر 6 أشهر حتى الشهر الحالي
  const trend = MONTHS.map((label, i) => {
    const ms = monthSummary(state, i);
    return { label: label.slice(0, 3), net: ms.net, income: ms.income, idx: i };
  });

  return (
    <PageShell>
      {/* رأس بخلفية ورقية */}
      <div className="relative -mx-4 -mt-5 overflow-hidden">
        <img src={HERO} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 to-background" />
        <div className="relative px-4 pb-4 pt-5">
          <div className="flex items-center justify-between">
            <BrandHeader />
          </div>
          <div className="mt-4">
            <MonthPicker />
          </div>
        </div>
      </div>

      {/* بطاقة الفائض/العجز البارزة */}
      <div
        className="animate-slide-up relative mt-4 overflow-hidden rounded-3xl border bg-card p-5 shadow-sm"
        style={{
          borderInlineStartWidth: 6,
          borderInlineStartColor: surplus ? "var(--olive)" : "var(--terracotta)",
        }}
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {surplus ? (
            <CheckCircle2 className="h-4 w-4 text-positive" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          )}
          <span>{surplus ? "فائض هذا الشهر" : "عجز هذا الشهر"}</span>
        </div>
        <div className="mt-2 flex items-end gap-2">
          <AnimatedNumber
            value={Math.abs(s.net)}
            className={surplus ? "text-4xl font-extrabold text-foreground" : "text-4xl font-extrabold text-destructive"}
          />
          <Riyal className="mb-1 text-xl" />
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {s.income === 0
            ? "أدخل بيانات هذا الشهر للبدء."
            : surplus
              ? `متبقّي لك بعد المصروفات والادخار في ${MONTHS[month]}.`
              : `المصروفات والادخار تجاوزت دخلك في ${MONTHS[month]}.`}
        </p>
      </div>

      {/* المؤشرات الأربعة */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          tone="olive"
          label="إجمالي الدخل"
          value={s.income}
        />
        <StatCard
          icon={<ArrowDownCircle className="h-4 w-4" />}
          tone="terracotta"
          label="إجمالي المصروفات"
          value={s.expenses}
        />
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          tone="olive"
          label="صافي السيولة"
          value={s.net}
        />
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <PiggyBank className="h-4 w-4" />
            </span>
            <span className="text-xs">نسبة الادخار</span>
          </div>
          <div className="mt-2 flex items-end gap-1">
            <span className="font-display text-2xl font-extrabold tabular">
              {fmtPercent(s.savingRate)}
            </span>
          </div>
          <ThinBar value={s.savingRate} tone="gold" className="mt-2" />
        </div>
      </div>

      {/* تنبيه البنود غير المسجّلة */}
      {s.income > 0 && unpaid > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
          <span>
            يوجد <b className="tabular">{unpaid}</b> بند أساسي بدون دفعة مُسجّلة هذا الشهر.
          </span>
        </div>
      )}

      {/* أعلى مصروف */}
      {top.amount > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-2xl border bg-card px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <Flame className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <p className="text-[11px] text-muted-foreground">أعلى مصروف هذا الشهر</p>
              <p className="font-semibold">{top.name}</p>
            </div>
          </div>
          <div className="flex items-end gap-1">
            <span className="font-display text-lg font-bold tabular">{fmt(top.amount)}</span>
            <Riyal className="mb-0.5 text-sm" />
          </div>
        </div>
      )}

      {/* توزيع المصروفات */}
      {breakdown.length > 0 && (
        <div className="mt-4 rounded-2xl border bg-card p-4 shadow-sm">
          <h3 className="font-display text-sm font-bold">توزيع المصروفات والادخار</h3>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-32 w-32 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={60}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {breakdown.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => fmtCurrency(v)}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      fontSize: 12,
                      fontFamily: "var(--font-sans)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {breakdown.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-sm" style={{ background: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                  </div>
                  <span className="tabular font-medium">{fmt(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* مقارنة المصروفات بالشهر السابق */}
      <div className="mt-4">
        <MonthComparison />
      </div>

      {/* اتجاه الصافي عبر السنة */}
      <div className="mt-4 rounded-2xl border bg-card p-4 shadow-sm">
        <h3 className="font-display text-sm font-bold">صافي السيولة عبر السنة</h3>
        <div className="mt-3 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fontFamily: "var(--font-sans)", fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                reversed
              />
              <Tooltip
                cursor={{ fill: "var(--muted)" }}
                formatter={(v: number) => fmtCurrency(v)}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  fontSize: 12,
                  fontFamily: "var(--font-sans)",
                }}
              />
              <Bar dataKey="net" radius={[6, 6, 0, 0]}>
                {trend.map((d, i) => (
                  <Cell
                    key={i}
                    fill={
                      d.idx === month
                        ? "var(--olive)"
                        : d.net >= 0
                          ? "oklch(0.46 0.066 135 / 0.45)"
                          : "var(--terracotta)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </PageShell>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "olive" | "terracotta";
}) {
  const negative = value < 0;
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span
          className={
            tone === "olive"
              ? "flex h-7 w-7 items-center justify-center rounded-lg bg-primary/12 text-primary"
              : "flex h-7 w-7 items-center justify-center rounded-lg bg-destructive/12 text-destructive"
          }
        >
          {icon}
        </span>
        <span className="text-xs">{label}</span>
      </div>
      <div className="mt-2 flex items-end gap-1">
        <AnimatedNumber
          value={Math.abs(value)}
          className={negative ? "text-2xl font-extrabold text-destructive" : "text-2xl font-extrabold"}
        />
        <Riyal className="mb-0.5 text-sm" />
        {negative && <TrendingDown className="mb-1 h-3.5 w-3.5 text-destructive" />}
      </div>
    </div>
  );
}
