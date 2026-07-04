// شاشة الإدخال — تعديل المبالغ الفعلية لكل بند في الشهر المختار + الأهداف
import { useState } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { GROUPS, GroupKey, MONTHS, LineItem } from "@/lib/financeData";
import {
  itemsByGroup,
  groupTotal,
  groupTargetTotal,
  evaluateItem,
  fmt,
} from "@/lib/calculations";
import { BrandHeader, PageShell } from "@/components/finance/AppLayout";
import { MonthPicker } from "@/components/finance/MonthPicker";
import { Riyal, StatusBadge } from "@/components/finance/Bits";
import {
  Wallet,
  Receipt,
  Landmark,
  ShoppingCart,
  PiggyBank,
  ChevronDown,
  Check,
  ListTree,
  MessageSquareText,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const GROUP_ICONS: Record<GroupKey, React.ReactNode> = {
  income: <Wallet className="h-4 w-4" />,
  fixed: <Receipt className="h-4 w-4" />,
  debt: <Landmark className="h-4 w-4" />,
  variable: <ShoppingCart className="h-4 w-4" />,
  savings: <PiggyBank className="h-4 w-4" />,
};

export default function Entry() {
  const { state } = useFinance();
  const month = state.currentMonth;
  const [open, setOpen] = useState<GroupKey | null>("income");

  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <BrandHeader subtitle="عدّل مبالغ هذا الشهر" />
      </div>
      <div className="mt-4">
        <MonthPicker />
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        اضغط على أي بند لتعديل مبلغه في <b className="text-foreground">{MONTHS[month]}</b>. لتعديل
        «الهدف» (الميزانية الشهرية) استخدم زر التعديل بجانب اسم المجموعة. كل التغييرات تُحفظ تلقائياً
        على جهازك.
      </p>

      <div className="mt-4 space-y-3">
        {GROUPS.map((g) => {
          const items = itemsByGroup(state, g.key);
          const total = groupTotal(state, g.key, month);
          const targetTotal = groupTargetTotal(state, g.key);
          const isOpen = open === g.key;
          return (
            <div key={g.key} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <button
                onClick={() => setOpen(isOpen ? null : g.key)}
                className="btn-press flex w-full items-center justify-between px-4 py-3.5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {GROUP_ICONS[g.key]}
                  </span>
                  <div className="text-start leading-tight">
                    <p className="font-display font-bold">{g.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      الإجمالي:{" "}
                      <span className="tabular font-medium text-foreground">{fmt(total)}</span>{" "}
                      <Riyal className="text-[10px]" />
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-180",
                  )}
                />
              </button>

              {isOpen && (
                <div className="border-t border-border">
                  <p className="px-4 pt-2.5 text-[11px] text-muted-foreground">{g.hint}</p>
                  <div className="px-2 pb-2 pt-1">
                    {items.map((item) => (
                      <ItemRow key={item.id} item={item} month={month} groupEval={g.evaluation} />
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-2.5 text-sm">
                    <span className="text-muted-foreground">إجمالي الهدف</span>
                    <span className="tabular font-semibold">
                      {fmt(targetTotal)} <Riyal className="text-xs" />
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => toast.success("بياناتك محفوظة تلقائياً على جهازك")}
        className="btn-press mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-display font-bold text-primary-foreground shadow-sm"
      >
        <Check className="h-5 w-5" />
        تم — احفظ
      </button>
    </PageShell>
  );
}

function ItemRow({
  item,
  month,
  groupEval,
}: {
  item: LineItem;
  month: number;
  groupEval: "higher_better" | "reach_target" | "lower_better";
}) {
  const { state, updateActual, updateTarget, transactionsFor, removeTransaction, moveTransaction } =
    useFinance();
  const [editingTarget, setEditingTarget] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [movingTxId, setMovingTxId] = useState<string | null>(null);
  const actual = item.monthly[month] || 0;
  const status = evaluateItem(item, month, groupEval);
  const details = transactionsFor(item.id, month);

  const tone =
    status === "good" ? "good" : status === "bad" ? "bad" : "neutral";

  return (
    <div className="rounded-xl px-2 py-2 transition-colors hover:bg-muted/40">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{item.name}</span>
            {item.target > 0 && status !== "neutral" && (
              <StatusBadge tone={tone === "good" ? "good" : "bad"}>
                {tone === "good" ? "✓" : "⚠"}
              </StatusBadge>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2.5">
            <button
              onClick={() => setEditingTarget((v) => !v)}
              className="text-[11px] text-muted-foreground hover:text-primary"
            >
              الهدف: <span className="tabular">{fmt(item.target)}</span> — تعديل
            </button>
            {details.length > 0 && (
              <button
                onClick={() => setShowDetails((v) => !v)}
                className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                <ListTree className="h-3 w-3" />
                التفاصيل ({details.length})
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-input bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring/40">
          <input
            type="number"
            inputMode="numeric"
            value={actual === 0 ? "" : actual}
            placeholder="0"
            onChange={(e) => {
              const v = e.target.value === "" ? 0 : Math.max(0, Number(e.target.value));
              if (!Number.isNaN(v)) updateActual(item.id, month, v);
            }}
            className="tabular w-20 bg-transparent text-end font-display text-base font-bold outline-none"
          />
          <Riyal className="text-xs" />
        </div>
      </div>

      {editingTarget && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-muted/60 px-3 py-2">
          <span className="text-xs text-muted-foreground">الهدف الشهري (الميزانية)</span>
          <div className="flex items-center gap-1 rounded-lg border border-input bg-background px-2 py-1">
            <input
              type="number"
              inputMode="numeric"
              value={item.target === 0 ? "" : item.target}
              placeholder="0"
              onChange={(e) => {
                const v = e.target.value === "" ? 0 : Math.max(0, Number(e.target.value));
                if (!Number.isNaN(v)) updateTarget(item.id, v);
              }}
              className="tabular w-20 bg-transparent text-end font-display font-bold outline-none"
            />
            <Riyal className="text-xs" />
          </div>
        </div>
      )}

      {showDetails && details.length > 0 && (
        <div className="mt-2 space-y-1.5 rounded-xl bg-muted/50 px-3 py-2.5">
          <p className="text-[11px] font-medium text-muted-foreground">
            مصادر معروفة من إجمالي {fmt(actual)} <Riyal className="text-[10px]" /> هذا الشهر:
          </p>
          {details.map((t) => (
            <div key={t.id} className="rounded-lg bg-background px-2.5 py-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  {t.source === "sms" ? (
                    <MessageSquareText className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                  ) : (
                    <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-xs font-medium">{t.note}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(t.dateISO).toLocaleDateString("ar-SA", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="tabular text-xs font-semibold">{fmt(t.amount)}</span>
                  <button
                    onClick={() => setMovingTxId((cur) => (cur === t.id ? null : t.id))}
                    title="نقل هذه الحركة لبند آخر"
                    className={cn(
                      "rounded-md p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary",
                      movingTxId === t.id && "bg-primary/10 text-primary",
                    )}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => removeTransaction(t.id)}
                    title="حذف هذه الحركة (وطرح مبلغها من الإجمالي)"
                    className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {movingTxId === t.id && (
                <div className="mt-1.5 flex items-center gap-1.5 border-t border-border pt-1.5">
                  <span className="shrink-0 text-[11px] text-muted-foreground">نقل إلى:</span>
                  <Select
                    value={item.id}
                    onValueChange={(newItemId) => {
                      if (newItemId === item.id) return;
                      const target = state.items.find((i) => i.id === newItemId);
                      moveTransaction(t.id, newItemId);
                      setMovingTxId(null);
                      toast.success(
                        `تم نقل ${fmt(t.amount)} ﷼ (${t.note}) إلى «${target?.name}»`,
                      );
                    }}
                  >
                    <SelectTrigger className="h-8 flex-1 bg-background text-xs">
                      <SelectValue placeholder="اختر البند" />
                    </SelectTrigger>
                    <SelectContent>
                      {GROUPS.map((g) => (
                        <div key={g.key}>
                          {state.items
                            .filter((i) => i.group === g.key)
                            .map((i) => (
                              <SelectItem key={i.id} value={i.id}>
                                {i.name}{" "}
                                <span className="text-muted-foreground">— {g.title}</span>
                              </SelectItem>
                            ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
