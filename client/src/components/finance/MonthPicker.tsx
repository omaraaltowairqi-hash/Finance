import { ChevronRight, ChevronLeft } from "lucide-react";
import { MONTHS } from "@/lib/financeData";
import { useFinance } from "@/contexts/FinanceContext";

// في RTL: زر "السابق" على اليمين، "التالي" على اليسار
export function MonthPicker() {
  const { state, setMonth } = useFinance();
  const month = state.currentMonth;

  const prev = () => setMonth((month - 1 + 12) % 12);
  const next = () => setMonth((month + 1) % 12);

  return (
    <div className="flex items-center justify-between gap-2 rounded-full border border-border bg-card/80 px-2 py-1.5 shadow-sm backdrop-blur">
      <button
        onClick={prev}
        aria-label="الشهر السابق"
        className="btn-press flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
      <div className="flex flex-col items-center leading-tight">
        <span className="font-display text-base font-bold">{MONTHS[month]}</span>
        <span className="text-[10px] text-muted-foreground">الشهر المعروض</span>
      </div>
      <button
        onClick={next}
        aria-label="الشهر التالي"
        className="btn-press flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
    </div>
  );
}
