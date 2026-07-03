// شاشة الإعدادات — تصدير البيانات، مسح، إعادة للبيانات الأصلية، تعليمات
import { useFinance } from "@/contexts/FinanceContext";
import { allMonthSummaries, fmtCurrency } from "@/lib/calculations";
import { MONTHS } from "@/lib/financeData";
import { BrandHeader, PageShell } from "@/components/finance/AppLayout";
import { SectionLabel } from "@/components/finance/Bits";
import {
  Download,
  RotateCcw,
  Trash2,
  Info,
  Smartphone,
  ShieldCheck,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function SettingsPage() {
  const { state, resetAll, clearData } = useFinance();

  const exportCsv = () => {
    const sums = allMonthSummaries(state);
    const rows = [
      ["الشهر", "إجمالي الدخل", "إجمالي المصروفات", "صافي السيولة", "الادخار", "نسبة الادخار"],
      ...sums.map((s) => [
        MONTHS[s.month],
        s.income,
        s.expenses,
        s.net,
        s.savings,
        `${Math.round(s.savingRate * 100)}%`,
      ]),
    ];
    const csv = "\uFEFF" + rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ملخص-مالي.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير الملخص الشهري");
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "بياناتي-المالية.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير نسخة احتياطية من بياناتك");
  };

  return (
    <PageShell>
      <BrandHeader subtitle="الإعدادات والبيانات" />

      {/* الخصوصية */}
      <div className="mt-5 rounded-2xl border border-positive/25 bg-positive/8 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-positive/15 text-positive">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display font-bold">بياناتك على جهازك فقط</p>
            <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
              كل أرقامك محفوظة محلياً على هذا الجهاز ولا تُرسل لأي خادم. لا حساب ولا تسجيل دخول.
            </p>
          </div>
        </div>
      </div>

      {/* النسخ والتصدير */}
      <div className="mt-6">
        <SectionLabel>النسخ والتصدير</SectionLabel>
      </div>
      <div className="mt-3 space-y-2.5">
        <ActionRow
          icon={<Download className="h-4 w-4" />}
          title="تصدير الملخص الشهري (CSV)"
          desc="جدول دخل ومصروفات كل شهر — يفتح في إكسل"
          onClick={exportCsv}
        />
        <ActionRow
          icon={<Download className="h-4 w-4" />}
          title="نسخة احتياطية كاملة (JSON)"
          desc="احفظ نسخة من كل بياناتك"
          onClick={exportJson}
        />
      </div>

      {/* إضافة للشاشة الرئيسية */}
      <div className="mt-6">
        <SectionLabel>التطبيق على جوالك</SectionLabel>
      </div>
      <div className="mt-3 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Smartphone className="h-5 w-5" />
          </span>
          <div className="text-sm leading-relaxed">
            <p className="font-display font-bold">أضف التطبيق للشاشة الرئيسية</p>
            <p className="mt-1 text-muted-foreground">
              من متصفح جوالك افتح قائمة المشاركة ثم اختر «إضافة إلى الشاشة الرئيسية» ليفتح كتطبيق
              مستقل بدون شريط المتصفح.
            </p>
          </div>
        </div>
      </div>

      {/* إدارة البيانات */}
      <div className="mt-6">
        <SectionLabel>إدارة البيانات</SectionLabel>
      </div>
      <div className="mt-3 space-y-2.5">
        <ConfirmRow
          icon={<RotateCcw className="h-4 w-4" />}
          title="استعادة البيانات الأصلية"
          desc="إرجاع كل الأرقام لبيانات الإكسل الأولى"
          confirmTitle="استعادة البيانات الأصلية؟"
          confirmDesc="سيتم استبدال كل تعديلاتك بالبيانات الأولية المنقولة من ملف الإكسل. لا يمكن التراجع."
          confirmLabel="استعادة"
          onConfirm={() => {
            resetAll();
            toast.success("تمت استعادة البيانات الأصلية");
          }}
        />
        <ConfirmRow
          icon={<Trash2 className="h-4 w-4" />}
          title="مسح كل المبالغ والبدء من جديد"
          desc="تصفير المبالغ الشهرية مع الإبقاء على البنود"
          danger
          confirmTitle="مسح كل المبالغ؟"
          confirmDesc="سيتم تصفير كل المبالغ الشهرية لجميع البنود. تبقى أسماء البنود وأهدافها. لا يمكن التراجع."
          confirmLabel="مسح الكل"
          onConfirm={() => {
            clearData();
            toast.success("تم تصفير المبالغ — ابدأ بإدخال بياناتك");
          }}
        />
      </div>

      {/* تعليمات */}
      <div className="mt-6">
        <SectionLabel>كيف تستخدم التطبيق</SectionLabel>
      </div>
      <div className="mt-3 rounded-2xl border bg-card p-4 text-sm leading-relaxed shadow-sm">
        <ul className="space-y-2.5">
          <Tip n="1">
            من تبويب <b>الإدخال</b>: اختر الشهر، واضغط على المجموعة، ثم عدّل المبلغ الفعلي لكل بند.
          </Tip>
          <Tip n="2">
            حدّد <b>الهدف</b> (الميزانية الشهرية) لكل بند مرة واحدة من زر «تعديل» بجانب اسمه.
          </Tip>
          <Tip n="3">
            <b>الرئيسية</b> تعرض ملخص الشهر المختار: الفائض/العجز، المؤشرات، أعلى مصروف، والرسوم.
          </Tip>
          <Tip n="4">
            <b>المؤشرات</b> تعرض الملخص السنوي، قاعدة 50/30/20، صندوق الطوارئ، وأهداف الادخار.
          </Tip>
          <Tip n="5">الأخضر = أداء جيد، الأحمر = يحتاج انتباه. كل شيء يُحفظ تلقائياً.</Tip>
        </ul>
      </div>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        دفتري المالي — تتبّع ثروتك بهدوء · كل المبالغ بالريال السعودي ﷼
      </p>
    </PageShell>
  );
}

function ActionRow({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="btn-press flex w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-start shadow-sm hover:bg-muted/40"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="flex-1 leading-tight">
        <p className="font-semibold">{title}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
    </button>
  );
}

function ConfirmRow({
  icon,
  title,
  desc,
  danger,
  confirmTitle,
  confirmDesc,
  confirmLabel,
  onConfirm,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  danger?: boolean;
  confirmTitle: string;
  confirmDesc: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="btn-press flex w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-start shadow-sm hover:bg-muted/40">
          <span
            className={
              danger
                ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/12 text-destructive"
                : "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
            }
          >
            {icon}
          </span>
          <div className="flex-1 leading-tight">
            <p className={danger ? "font-semibold text-destructive" : "font-semibold"}>{title}</p>
            <p className="text-[11px] text-muted-foreground">{desc}</p>
          </div>
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-start">{confirmTitle}</AlertDialogTitle>
          <AlertDialogDescription className="text-start leading-relaxed">
            {confirmDesc}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={danger ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Tip({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[11px] font-bold text-primary">
        {n}
      </span>
      <span className="text-foreground/90">{children}</span>
    </li>
  );
}
