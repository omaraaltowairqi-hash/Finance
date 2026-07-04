// شاشة "الرسائل البنكية" — تقرأ رسائل البنك وتحلّلها وتقترح إضافتها (شبه تلقائي)
// تصميم: الدفتر الهادئ — بطاقات ورقية، أخضر زيتوني للدخل/التأكيد، تيراكوتا للتنبيه.
// كل المعالجة محلية على الجهاز. الرسائل لا تُرسل لأي خادم.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { GROUPS, GroupKey, MONTHS } from "@/lib/financeData";
import { fmt } from "@/lib/calculations";
import { BrandHeader, PageShell } from "@/components/finance/AppLayout";
import { MonthPicker } from "@/components/finance/MonthPicker";
import { Riyal, StatusBadge, SectionLabel } from "@/components/finance/Bits";
import {
  MessageSquareText,
  ShieldCheck,
  RefreshCw,
  Check,
  X,
  ArrowDownCircle,
  ArrowUpCircle,
  Inbox,
  Loader2,
  Info,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  checkSmsPermission,
  requestSmsPermission,
  readInboxMessages,
  isNativeAndroid,
  RawSms,
} from "@/lib/smsBridge";
import { parseSms, looksLikeBankSms, smsFingerprint, smsNoteFor, ParsedSms } from "@/lib/smsParser";
import { markProcessed, loadProcessed } from "@/lib/smsStore";
import {
  BANKS,
  loadSelectedBanks,
  saveSelectedBanks,
  hasConfiguredBanks,
} from "@/lib/banks";
import { Landmark, ChevronDown, Check as CheckIcon } from "lucide-react";

interface Suggestion extends ParsedSms {
  fingerprint: string;
  smsDate: number; // وقت وصول الرسالة
  chosenItemId: string; // البند المختار حالياً (قابل للتعديل)
}

type Phase = "idle" | "loading" | "ready" | "denied";

export default function BankSms() {
  const { state, addTransaction } = useFinance();
  const month = state.currentMonth;

  const [phase, setPhase] = useState<Phase>("idle");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // البنوك المختارة — تُحفظ محلياً
  const [selectedBanks, setSelectedBanks] = useState<string[]>(() => loadSelectedBanks());
  const [banksExpanded, setBanksExpanded] = useState(() => !hasConfiguredBanks());

  const toggleBank = useCallback((id: string) => {
    setSelectedBanks((prev) => {
      const next = prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id];
      saveSelectedBanks(next);
      return next;
    });
  }, []);

  const scan = useCallback(async () => {
    setPhase("loading");
    // 1) التحقق من الصلاحية / طلبها
    let granted = await checkSmsPermission();
    if (!granted) {
      granted = await requestSmsPermission();
    }
    setPermissionGranted(granted);
    if (!granted) {
      setPhase("denied");
      return;
    }

    // 2) قراءة الرسائل — مقتصرة على البنوك المختارة
    const raw: RawSms[] = await readInboxMessages({ limit: 300, banks: selectedBanks });

    // 3) التصفية + التحليل + استبعاد المعالَجة سابقاً
    const processed = loadProcessed();
    const parsed: Suggestion[] = [];
    for (const msg of raw) {
      if (!looksLikeBankSms(msg.body)) continue;
      const p = parseSms(msg.body);
      if (!p) continue;
      const fp = smsFingerprint(p);
      if (processed[fp]) continue; // تجاهل ما سبق تأكيده/رفضه
      parsed.push({
        ...p,
        fingerprint: fp,
        smsDate: msg.date,
        chosenItemId: p.suggestedItemId,
      });
    }
    // ترتيب الأحدث أولاً
    parsed.sort((a, b) => b.smsDate - a.smsDate);
    setSuggestions(parsed);
    setPhase("ready");
  }, [selectedBanks]);

  // فحص حالة الصلاحية عند الفتح (بدون طلب تلقائي)
  useEffect(() => {
    checkSmsPermission().then(setPermissionGranted);
  }, []);

  const setChosenItem = (fp: string, itemId: string) => {
    setSuggestions((list) =>
      list.map((s) => (s.fingerprint === fp ? { ...s, chosenItemId: itemId } : s)),
    );
  };

  const confirm = (s: Suggestion) => {
    const item = state.items.find((i) => i.id === s.chosenItemId);
    if (!item) return;
    // نحفظ مع المبلغ وصفاً مفهوماً (اسم الجهة عادةً) وتاريخ وصول الرسالة الحقيقي،
    // حتى يقدر المستخدم بعدين يفتح البند ويشوف "من وين جاء" هذا الريال بالضبط.
    const note = smsNoteFor(s);
    addTransaction(
      s.chosenItemId,
      month,
      s.amount,
      note,
      "sms",
      new Date(s.smsDate).toISOString(),
    );
    markProcessed(s.fingerprint, "added");
    setSuggestions((list) => list.filter((x) => x.fingerprint !== s.fingerprint));
    toast.success(
      `أُضيف ${fmt(s.amount)} ﷼ (${note}) إلى «${item.name}» في ${MONTHS[month]}`,
    );
  };

  const ignore = (s: Suggestion) => {
    markProcessed(s.fingerprint, "ignored");
    setSuggestions((list) => list.filter((x) => x.fingerprint !== s.fingerprint));
    toast("تم تجاهل الرسالة");
  };

  const incomeCount = suggestions.filter((s) => s.kind === "income").length;
  const expenseCount = suggestions.length - incomeCount;

  return (
    <PageShell>
      <BrandHeader subtitle="اقرأ رسائل بنكك واقترح إضافتها" />

      {/* خصوصية */}
      <div className="mt-4 rounded-2xl border border-positive/25 bg-positive/8 p-3.5">
        <div className="flex items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-positive/15 text-positive">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            التطبيق يقرأ رسائل البنك <b className="text-foreground">على جهازك فقط</b> ويقترح
            التصنيف — ولا يضيف شيئاً إلا بعد تأكيدك. لا تُرسل أي رسالة لأي خادم.
          </p>
        </div>
      </div>

      {/* اختيار البنوك */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <button
          onClick={() => setBanksExpanded((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3.5 text-start"
        >
          <span className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Landmark className="h-4.5 w-4.5" />
            </span>
            <span className="leading-tight">
              <span className="block font-display font-bold">بنوكي</span>
              <span className="block text-[11px] text-muted-foreground">
                {selectedBanks.length > 0
                  ? `يُقرأ من ${selectedBanks.length} ${selectedBanks.length === 1 ? "بنك" : "بنوك"}`
                  : "لم تختر أي بنك بعد"}
              </span>
            </span>
          </span>
          <ChevronDown
            className={cn(
              "h-5 w-5 text-muted-foreground transition-transform duration-200",
              banksExpanded && "rotate-180",
            )}
          />
        </button>

        {banksExpanded && (
          <div className="border-t border-border px-3 pb-3 pt-1">
            <p className="px-1 py-2 text-[12px] leading-relaxed text-muted-foreground">
              اختر البنوك التي تصلك منها رسائل المعاملات، وسيقرأ التطبيق
              رسائل هذه البنوك فقط.
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {BANKS.map((b) => {
                const active = selectedBanks.includes(b.id);
                return (
                  <button
                    key={b.id}
                    onClick={() => toggleBank(b.id)}
                    className={cn(
                      "btn-press flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-start transition-colors",
                      active
                        ? "border-primary/40 bg-primary/8"
                        : "border-border bg-background hover:bg-muted/60",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[13.5px] font-medium",
                        active ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {b.name}
                    </span>
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-md border",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background",
                      )}
                    >
                      {active && <CheckIcon className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* اختيار الشهر الوجهة */}
      <div className="mt-4">
        <p className="mb-2 text-[12px] text-muted-foreground">
          المعاملات المؤكَّدة ستُضاف إلى شهر:
        </p>
        <MonthPicker />
      </div>

      {selectedBanks.length === 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/8 p-3 text-[12px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <span>
            اختر بنكاً واحداً على الأقل من الأعلى لتفعيل قراءة الرسائل.
          </span>
        </div>
      )}

      {/* زر الفحص */}
      <button
        onClick={scan}
        disabled={phase === "loading" || selectedBanks.length === 0}
        className="btn-press mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-display font-bold text-primary-foreground shadow-sm disabled:opacity-50"
      >
        {phase === "loading" ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <RefreshCw className="h-5 w-5" />
        )}
        {phase === "loading" ? "جارٍ قراءة الرسائل…" : "افحص رسائل البنك"}
      </button>

      {!isNativeAndroid() && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/8 p-3 text-[12px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <span>
            أنت تعاين على المتصفّح، لذا ستظهر <b className="text-foreground">رسائل تجريبية</b>{" "}
            للتوضيح. على جوالك بعد تثبيت التطبيق ستُقرأ رسائلك الحقيقية بعد السماح بالصلاحية.
          </span>
        </div>
      )}

      {/* الحالات */}
      {phase === "denied" && (
        <div className="mt-6 rounded-2xl border border-destructive/25 bg-destructive/8 p-4 text-center">
          <p className="font-display font-bold text-destructive">لم يتم منح صلاحية قراءة الرسائل</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            لتفعيل الميزة، اسمح للتطبيق بقراءة الرسائل من إعدادات جوالك: الإعدادات ← التطبيقات ←
            دفتري المالي ← الأذونات ← الرسائل النصية ← السماح، ثم أعد الفحص.
          </p>
        </div>
      )}

      {phase === "ready" && suggestions.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 py-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Inbox className="h-7 w-7" />
          </span>
          <div>
            <p className="font-display font-bold">لا توجد رسائل جديدة للاقتراح</p>
            <p className="mt-1 text-sm text-muted-foreground">
              فحصنا رسائلك ولم نجد معاملات بنكية جديدة لم تُعالَج بعد.
            </p>
          </div>
        </div>
      )}

      {phase === "ready" && suggestions.length > 0 && (
        <>
          <div className="mt-6 flex items-center gap-2">
            <SectionLabel>
              {suggestions.length} رسالة مقترحة
            </SectionLabel>
          </div>
          <div className="mt-2 flex items-center justify-center gap-2">
            {incomeCount > 0 && (
              <StatusBadge tone="good">
                <ArrowDownCircle className="h-3 w-3" /> {incomeCount} دخل
              </StatusBadge>
            )}
            {expenseCount > 0 && (
              <StatusBadge tone="bad">
                <ArrowUpCircle className="h-3 w-3" /> {expenseCount} مصروف
              </StatusBadge>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {suggestions.map((s) => (
              <SuggestionCard
                key={s.fingerprint}
                s={s}
                onChoose={(itemId) => setChosenItem(s.fingerprint, itemId)}
                onConfirm={() => confirm(s)}
                onIgnore={() => ignore(s)}
              />
            ))}
          </div>
        </>
      )}

      {phase === "idle" && (
        <div className="mt-8 flex flex-col items-center gap-3 py-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MessageSquareText className="h-7 w-7" />
          </span>
          <div>
            <p className="font-display font-bold">اربط رسائل بنكك</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              اختر بنوكك من الأعلى، ثم اضغط «افحص رسائل البنك» ليقرأ التطبيق
              رسائلها ويقترح تصنيفها. تؤكّد ما تريد إضافته فقط.
            </p>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function bankName(bank: ParsedSms["bank"]): string {
  if (bank === "rajhi") return "مصرف الراجحي";
  if (bank === "sab") return "البنك الأول";
  return "بنك";
}

function confidenceLabel(c: ParsedSms["confidence"]): { text: string; tone: "good" | "warning" | "neutral" } {
  if (c === "high") return { text: "ثقة عالية", tone: "good" };
  if (c === "medium") return { text: "راجعها", tone: "warning" };
  return { text: "تحقّق منها", tone: "warning" };
}

function SuggestionCard({
  s,
  onChoose,
  onConfirm,
  onIgnore,
}: {
  s: Suggestion;
  onChoose: (itemId: string) => void;
  onConfirm: () => void;
  onIgnore: () => void;
}) {
  const { state } = useFinance();
  const isIncome = s.kind === "income";
  const conf = confidenceLabel(s.confidence);
  const [showRaw, setShowRaw] = useState(false);

  // البنود المتاحة للاختيار — مجمّعة حسب المجموعة، مع تفضيل الملائم لنوع المعاملة
  const relevantGroups: GroupKey[] = isIncome
    ? ["income"]
    : ["fixed", "debt", "variable", "savings"];

  const chosen = state.items.find((i) => i.id === s.chosenItemId);
  const smsDate = new Date(s.smsDate);
  const dateStr = smsDate.toLocaleDateString("ar-SA", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-sm",
        isIncome ? "border-positive/30" : "border-border",
      )}
    >
      {/* رأس البطاقة: النوع + المبلغ */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3",
          isIncome ? "bg-positive/8" : "bg-muted/40",
        )}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              isIncome
                ? "bg-positive/15 text-positive"
                : "bg-destructive/12 text-destructive",
            )}
          >
            {isIncome ? (
              <ArrowDownCircle className="h-5 w-5" />
            ) : (
              <ArrowUpCircle className="h-5 w-5" />
            )}
          </span>
          <div className="leading-tight">
            <p className="font-display font-bold">
              {isIncome ? "دخل وارد" : "مصروف"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {bankName(s.bank)}
              {s.party ? ` · ${s.party}` : ""}
            </p>
          </div>
        </div>
        <div className="text-end">
          <p
            className={cn(
              "font-display text-lg font-extrabold tabular",
              isIncome ? "text-positive" : "text-foreground",
            )}
          >
            {isIncome ? "+" : "−"}
            {fmt(s.amount)} <Riyal className="text-xs" />
          </p>
          <p className="text-[10px] text-muted-foreground">{dateStr}</p>
        </div>
      </div>

      {/* جسم: التصنيف المقترح + سبب */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] text-muted-foreground">التصنيف المقترح</span>
          <StatusBadge tone={conf.tone}>{conf.text}</StatusBadge>
        </div>

        {/* منتقي البند */}
        <div className="mt-2">
          <Select value={s.chosenItemId} onValueChange={onChoose}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="اختر البند" />
            </SelectTrigger>
            <SelectContent>
              {relevantGroups.map((gk) => {
                const g = GROUPS.find((x) => x.key === gk)!;
                const items = state.items.filter((i) => i.group === gk);
                return items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name} — <span className="text-muted-foreground">{g.title}</span>
                  </SelectItem>
                ));
              })}
            </SelectContent>
          </Select>
        </div>

        <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{s.reason}</p>

        {/* عرض نص الرسالة الأصلي */}
        <button
          onClick={() => setShowRaw((v) => !v)}
          className="mt-2 text-[11px] text-primary hover:underline"
        >
          {showRaw ? "إخفاء نص الرسالة" : "عرض نص الرسالة الأصلي"}
        </button>
        {showRaw && (
          <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-muted/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
            {s.raw}
          </pre>
        )}
      </div>

      {/* أزرار التأكيد/التجاهل */}
      <div className="flex items-stretch gap-2 border-t border-border p-3">
        <button
          onClick={onConfirm}
          className="btn-press flex flex-[2] items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 font-display font-bold text-primary-foreground shadow-sm"
        >
          <Check className="h-4 w-4" />
          أضِف إلى {chosen?.name ?? "البند"}
        </button>
        <button
          onClick={onIgnore}
          className="btn-press flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2.5 font-display font-semibold text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
          تجاهل
        </button>
      </div>
    </div>
  );
}
