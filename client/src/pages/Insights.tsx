// شاشة المؤشرات: ملخص سنوي + قاعدة 50/30/20 + صندوق الطوارئ + أهداف الادخار + ملخص ذكي
import { useFinance } from "@/contexts/FinanceContext";
import {
  yearSummary,
  rule503020,
  emergencyFund,
  topExpenseYear,
  fmt,
  fmtCurrency,
  fmtPercent,
} from "@/lib/calculations";
import { BrandHeader, PageShell } from "@/components/finance/AppLayout";
import { Riyal, ThinBar, StatusBadge, SectionLabel } from "@/components/finance/Bits";
import {
  CalendarRange,
  Scale,
  ShieldCheck,
  Target,
  Sparkles,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

export default function Insights() {
  const { state } = useFinance();
  const ys = yearSummary(state);
  const rule = rule503020(state);
  const ef = emergencyFund(state);
  const topYear = topExpenseYear(state);
  const surplus = ys.totalNet >= 0;

  return (
    <PageShell>
      <BrandHeader subtitle="ملخص ومؤشرات السنة" />

      {/* الملخص السنوي */}
      <div className="mt-5">
        <SectionLabel>الملخص السنوي</SectionLabel>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <BigStat icon={<TrendingUp className="h-4 w-4" />} label="إجمالي الدخل" value={ys.totalIncome} tone="olive" />
        <BigStat icon={<TrendingDown className="h-4 w-4" />} label="إجمالي المصروفات" value={ys.totalExpenses} tone="terracotta" />
        <BigStat icon={<CalendarRange className="h-4 w-4" />} label="صافي السيولة السنوي" value={ys.totalNet} tone="olive" />
        <BigStat icon={<Target className="h-4 w-4" />} label="إجمالي الادخار" value={ys.totalSavings} tone="gold" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <RateCard label="نسبة الادخار" value={ys.savingRate} sub="الادخار ÷ الدخل" />
        <RateCard label="نسبة الفائض" value={ys.surplusRate} sub="الصافي ÷ الدخل" />
      </div>

      {/* قاعدة 50/30/20 */}
      <div className="mt-6">
        <SectionLabel>مؤشر الصحة المالية — قاعدة 50/30/20</SectionLabel>
      </div>
      <div className="mt-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Scale className="h-4 w-4" />
          </span>
          <h3 className="font-display font-bold">توزيع دخلك السنوي</h3>
        </div>
        <RuleRow label="الاحتياجات (سكن، فواتير، التزامات، أساسيات)" pct={rule.needsRate} ideal={0.5} ok={rule.needsOk} tone="olive" />
        <RuleRow label="الكماليات (مطاعم، توصيل، أخرى)" pct={rule.wantsRate} ideal={0.3} ok={rule.wantsOk} tone="gold" />
        <RuleRow label="الادخار" pct={rule.savingsRate} ideal={0.2} ok={rule.savingsOk} tone="terracotta" higherBetter />
        <div className="mt-3 rounded-xl bg-muted/50 px-3 py-2.5 text-sm leading-relaxed">
          {rule.overall === "excellent" && "🟢 ممتاز — توزيعك قريب من قاعدة 50/30/20."}
          {rule.overall === "good" && "🟡 جيد — حاول رفع نسبة الادخار نحو 20%."}
          {rule.overall === "attention" && "🔴 يحتاج انتباه — مصروفاتك تستهلك معظم دخلك."}
          {rule.overall === "none" && "أدخل بيانات الدخل أولاً لعرض التقييم."}
        </div>
      </div>

      {/* صندوق الطوارئ */}
      <div className="mt-6">
        <SectionLabel>صندوق الطوارئ</SectionLabel>
      </div>
      <div className="mt-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-positive/12 text-positive">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <p className="text-[11px] text-muted-foreground">رصيد الطوارئ المُجمّع</p>
              <p className="font-display text-xl font-extrabold tabular">
                {fmt(ef.balance)} <Riyal className="text-sm" />
              </p>
            </div>
          </div>
          <div className="text-end">
            <p className="text-[11px] text-muted-foreground">يغطّيك لمدة</p>
            <p className="font-display text-xl font-extrabold tabular">
              {ef.coverMonths.toFixed(1)} <span className="text-sm font-medium">شهر</span>
            </p>
          </div>
        </div>
        <ThinBar value={ef.coverMonths / 6} tone="olive" className="mt-3" />
        <p className="mt-2 text-sm text-muted-foreground">
          {ef.status === "excellent" && "🟢 ممتاز — تغطية 6 أشهر أو أكثر."}
          {ef.status === "good" && "🟡 جيد — استهدف 3 إلى 6 أشهر."}
          {ef.status === "attention" && "🔴 ابنِ صندوق طوارئ يغطي 3-6 أشهر."}
          {ef.status === "none" && "أدخل بيانات مصاريفك لحساب التغطية."}
        </p>
      </div>

      {/* أهداف الادخار */}
      <div className="mt-6">
        <SectionLabel>متتبّع أهداف الادخار</SectionLabel>
      </div>
      <SavingGoals />

      {/* الملخص الذكي */}
      <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" />
          <span className="font-display text-sm font-bold">ملخص ذكي</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-foreground/90">
          خلال السنة ادخرت <b className="tabular">{fmt(ys.totalSavings)} ﷼</b> (
          {fmtPercent(ys.savingRate)} من دخلك). أكبر بند مصروف هو «<b>{topYear.name}</b>» بإجمالي{" "}
          <b className="tabular">{fmt(topYear.amount)} ﷼</b>. وضعك العام {surplus ? "فائض" : "عجز"}{" "}
          بمقدار <b className="tabular">{fmt(Math.abs(ys.totalNet))} ﷼</b>.
        </p>
      </div>
    </PageShell>
  );
}

function SavingGoals() {
  const { state, updateGoalTotal } = useFinance();
  // المُجمّع لكل هدف = مجموع البند الشهري عبر السنة
  const collected = (id: string) => {
    const item = state.items.find((i) => i.id === id);
    return item ? item.monthly.reduce((a, b) => a + b, 0) : 0;
  };
  return (
    <div className="mt-3 space-y-3">
      {state.savingGoals.map((goal) => {
        const c = collected(goal.id);
        const pct = goal.total === 0 ? 0 : c / goal.total;
        const remaining = Math.max(goal.total - c, 0);
        return (
          <div key={goal.id} className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-display font-bold">{goal.name}</p>
              {goal.total > 0 && (
                <StatusBadge tone={pct >= 1 ? "good" : "neutral"}>{fmtPercent(pct)}</StatusBadge>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                المُجمّع: <span className="tabular font-medium text-foreground">{fmt(c)}</span>
              </span>
              <div className="flex items-center gap-1 text-muted-foreground">
                <span>الهدف الكلي:</span>
                <div className="flex items-center gap-1 rounded-lg border border-input bg-background px-2 py-0.5">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={goal.total === 0 ? "" : goal.total}
                    placeholder="0"
                    onChange={(e) => {
                      const v = e.target.value === "" ? 0 : Math.max(0, Number(e.target.value));
                      if (!Number.isNaN(v)) updateGoalTotal(goal.id, v);
                    }}
                    className="tabular w-16 bg-transparent text-end font-display font-bold text-foreground outline-none"
                  />
                  <Riyal className="text-[10px]" />
                </div>
              </div>
            </div>
            <ThinBar value={pct} tone="gold" className="mt-2.5" />
            {goal.total > 0 && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                المتبقّي: <span className="tabular">{fmt(remaining)} ﷼</span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BigStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "olive" | "terracotta" | "gold";
}) {
  const colorMap = {
    olive: "bg-primary/12 text-primary",
    terracotta: "bg-destructive/12 text-destructive",
    gold: "bg-gold/15 text-gold",
  };
  const negative = value < 0;
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${colorMap[tone]}`}>
          {icon}
        </span>
        <span className="text-[11px] leading-tight">{label}</span>
      </div>
      <div className="mt-2 flex items-end gap-1">
        <span
          className={
            negative
              ? "font-display text-xl font-extrabold tabular text-destructive"
              : "font-display text-xl font-extrabold tabular"
          }
        >
          {fmt(Math.abs(value))}
        </span>
        <Riyal className="mb-0.5 text-xs" />
      </div>
    </div>
  );
}

function RateCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold tabular text-primary">
        {fmtPercent(value)}
      </p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function RuleRow({
  label,
  pct,
  ideal,
  ok,
  tone,
  higherBetter,
}: {
  label: string;
  pct: number;
  ideal: number;
  ok: boolean;
  tone: "olive" | "terracotta" | "gold";
  higherBetter?: boolean;
}) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground/90">{label}</span>
        <div className="flex items-center gap-2">
          <span className="tabular font-bold">{fmtPercent(pct)}</span>
          <StatusBadge tone={ok ? "good" : "bad"}>
            {ok ? "ضمن الحد" : higherBetter ? "تحت المستهدف" : "مرتفع"}
          </StatusBadge>
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <ThinBar value={pct} tone={tone} className="flex-1" />
        <span className="shrink-0 text-[10px] text-muted-foreground">المثالي {fmtPercent(ideal)}</span>
      </div>
    </div>
  );
}
