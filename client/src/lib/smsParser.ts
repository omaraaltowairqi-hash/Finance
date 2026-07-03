// محلّل رسائل SMS البنكية — يفهم صيغ بنك الراجحي والبنك الأول (SAB)
// يعمل محلياً بالكامل على الجهاز. لا يرسل أي بيانات لأي خادم.
//
// الهدف: من نص رسالة بنكية، استخراج:
//   - النوع: دخل (income) أو مصروف (expense)
//   - المبلغ بالريال
//   - الجهة/الطرف الآخر (merchant / sender)
//   - التاريخ (إن وُجد)
//   - البند المقترح في التطبيق (itemId) والتصنيف
//   - مستوى الثقة في التطبيق التلقائي

import { GroupKey } from "./financeData";

export type SmsKind = "income" | "expense";

export interface ParsedSms {
  raw: string; // النص الأصلي الكامل
  bank: "rajhi" | "sab" | "unknown";
  kind: SmsKind;
  amount: number; // المبلغ الموجب بالريال
  party?: string; // الجهة (تاجر / مُرسِل / مستفيد)
  dateISO?: string; // التاريخ بصيغة ISO إن أمكن استخراجه
  balance?: number; // الرصيد بعد العملية إن وُجد
  fees?: number; // الرسوم إن وُجدت
  suggestedItemId: string; // البند المقترح في التطبيق
  suggestedGroup: GroupKey; // المجموعة المقترحة
  suggestedLabel: string; // وصف عربي للتصنيف المقترح
  confidence: "high" | "medium" | "low";
  reason: string; // شرح مختصر لسبب التصنيف (يظهر للمستخدم)
}

// ————————————————————————————————————————————————
// أدوات مساعدة لاستخراج الأرقام والتواريخ
// ————————————————————————————————————————————————

// يحوّل الأرقام العربية الهندية إلى لاتينية
function normalizeDigits(s: string): string {
  const map: Record<string, string> = {
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
    "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
    "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  };
  return s.replace(/[٠-٩۰-۹]/g, (d) => map[d] ?? d);
}

// يستخرج جميع المبالغ المسبوقة/المتبوعة بعملة، ويختار الأنسب
// يدعم: "SAR 289.00" | "SR 25262.68" | "بـSR 25262.68" | "مبلغ: SAR 600.00"
//       | "2,828.90 SAR" | "بمبلغ SAR 289.00"
// ملاحظة مهمة: أرقام الآيبان/الحساب (مثل **9789) لا تكون مسبوقة بعملة، فتُستبعد تلقائياً.
function extractAllCurrencyAmounts(text: string): number[] {
  const t = normalizeDigits(text);
  const results: number[] = [];

  // العملة (قد تكون ملتصقة مثل "بـSR25262.68") ثم الرقم
  const beforeRe =
    /(?:SAR|SR|ريال|ر\.?\s?س)\s*[:：]?\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/gi;
  let m: RegExpExecArray | null;
  while ((m = beforeRe.exec(t)) !== null) {
    const num = Number(m[1].replace(/,/g, ""));
    if (Number.isFinite(num) && num > 0) results.push(num);
  }

  // الرقم ثم العملة — "2,828.90 SAR"
  const afterRe =
    /([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\s*(?:SAR|SR|ريال|ر\.?\s?س)/gi;
  while ((m = afterRe.exec(t)) !== null) {
    const num = Number(m[1].replace(/,/g, ""));
    if (Number.isFinite(num) && num > 0) results.push(num);
  }

  return results;
}

function extractAmount(text: string): number | null {
  const all = extractAllCurrencyAmounts(text);
  if (all.length === 0) return null;
  // نختار أكبر مبلغ (المبلغ الرئيسي عادةً أكبر من الرسوم، ويستبعد أرقام قصيرة عرضية)
  return Math.max(...all);
}

// يستخرج «المبلغ» تحديداً من سطر يبدأ بكلمة مبلغ/القسط إن وُجد (أدق من أول رقم)
function extractLabeledAmount(text: string, labels: string[]): number | null {
  const t = normalizeDigits(text);
  for (const label of labels) {
    // يقبل: "مبلغ: SAR 600.00" | "القسط: 2,828.90 SAR" | "بمبلغ SAR 289.00"
    const re = new RegExp(
      label +
        "\\s*[:：]?\\s*(?:SAR|SR|ريال|ر\\.?\\s?س)?\\s*([0-9][0-9,]*(?:\\.[0-9]{1,2})?)",
      "i",
    );
    const m = t.match(re);
    if (m) {
      const num = Number(m[1].replace(/,/g, ""));
      if (Number.isFinite(num)) return num;
    }
  }
  return null;
}

// يستخرج التاريخ بصيغ متعددة ويعيد ISO
// يدعم: "2026-06-30 09:47:02" | "26/6/28 01:50" | "في: 2026-06-29 20:36:16"
function extractDate(text: string): string | undefined {
  const t = normalizeDigits(text);

  // صيغة كاملة YYYY-MM-DD HH:MM:SS
  const full = t.match(/(20[0-9]{2})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (full) {
    const [, y, mo, d, h = "0", mi = "0", s = "0"] = full;
    const dt = new Date(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s),
    );
    if (!Number.isNaN(dt.getTime())) return dt.toISOString();
  }

  // صيغة مختصرة YY/M/D (مثل 26/6/28) — نفترض 20YY
  const short = t.match(/\b(\d{2})[-/](\d{1,2})[-/](\d{1,2})\b(?:\s+(\d{1,2}):(\d{2}))?/);
  if (short) {
    const [, yy, mo, d, h = "0", mi = "0"] = short;
    const dt = new Date(2000 + Number(yy), Number(mo) - 1, Number(d), Number(h), Number(mi));
    if (!Number.isNaN(dt.getTime())) return dt.toISOString();
  }

  return undefined;
}

// يستخرج الطرف الآخر (تاجر / مُرسِل / مستفيد)
function extractParty(text: string): string | undefined {
  const t = text;
  // "لدى Tamara من خلال" → Tamara
  const merchant = t.match(/لدى\s+([^\n]+?)(?:\s+من خلال|\n|$)/);
  if (merchant) return merchant[1].trim();
  // "من: OMAR ..." أو "من;مجلس الضمان..."
  const from = t.match(/من\s*[:;؛]\s*([^\n]+)/);
  if (from) return from[1].trim();
  // "لـ: تمويل منازل"
  const forWhat = t.match(/لـ\s*[:：]\s*([^\n]+)/);
  if (forWhat) return forWhat[1].trim();
  // "إلى: سعد عبدالعزيز"
  const to = t.match(/إلى\s*[:：]\s*([^\n]+)/);
  if (to) return to[1].trim();
  return undefined;
}

function extractBalance(text: string): number | undefined {
  const t = normalizeDigits(text);
  const m = t.match(/الرصيد\s*[:：]?\s*(?:SAR|SR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  if (m) {
    const num = Number(m[1].replace(/,/g, ""));
    if (Number.isFinite(num)) return num;
  }
  return undefined;
}

function extractFees(text: string): number | undefined {
  const t = normalizeDigits(text);
  const m = t.match(/رسوم\s*[:：]?\s*(?:SAR|SR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  if (m) {
    const num = Number(m[1].replace(/,/g, ""));
    if (Number.isFinite(num)) return num;
  }
  return undefined;
}

// ————————————————————————————————————————————————
// كشف البنك
// ————————————————————————————————————————————————
function detectBank(text: string): ParsedSms["bank"] {
  const t = text.toLowerCase();
  if (/الأول|الاول|\bsab\b|alfursan|mastercard alfursan/i.test(text) || /alfursan/i.test(t)) {
    return "sab";
  }
  if (/الراجحي|مصرف الراجحي|rajhi/i.test(text)) return "rajhi";
  return "unknown";
}

// ————————————————————————————————————————————————
// قاموس التصنيف: يربط كلمات الجهة بالبند المناسب في التطبيق
// ————————————————————————————————————————————————
interface CategoryRule {
  // كلمات مفتاحية تبحث في الجهة/النص
  keywords: RegExp;
  itemId: string;
  group: GroupKey;
  label: string;
}

// قواعد المصروفات حسب الجهة
const EXPENSE_MERCHANT_RULES: CategoryRule[] = [
  { keywords: /tamara|تمارا|tabby|تابي/i, itemId: "bnpl", group: "debt", label: "تابي / تمارا" },
  { keywords: /تمويل منازل|عقار|رهن|سكني/i, itemId: "mortgage", group: "debt", label: "قرض عقاري" },
  { keywords: /تمويل سيار|سيارة|قرض سيار/i, itemId: "car_loan", group: "debt", label: "قرض سيارة" },
  { keywords: /بترول|محطة|petromin|aldrees|الدريس|ساسكو|بنزين|وقود|fuel|petrol/i, itemId: "fuel", group: "variable", label: "بنزين ومواصلات" },
  { keywords: /هنقرستيشن|hungerstation|جاهز|jahez|مرسول|mrsool|توصيل|طلبات/i, itemId: "delivery", group: "variable", label: "تطبيقات توصيل" },
  { keywords: /مطعم|كافيه|كوفي|restaurant|cafe|starbucks|ستاربكس|مقهى/i, itemId: "dining", group: "variable", label: "مطاعم وكافيهات" },
  { keywords: /صيدلية|النهدي|الدواء|pharmacy|nahdi|whites|dawaa/i, itemId: "pharmacy", group: "variable", label: "صيدلية وعلاج" },
  { keywords: /بندة|panda|كارفور|carrefour|لولو|lulu|تميمي|tamimi|العثيم|مقاضي|سوبرماركت|هايبر/i, itemId: "groceries", group: "variable", label: "مقاضي البيت" },
  { keywords: /كهرباء|السعودية للكهرباء|فاتورة كهرباء/i, itemId: "electricity", group: "fixed", label: "الكهرباء" },
  { keywords: /مياه|المياه الوطنية|فاتورة مياه/i, itemId: "water", group: "fixed", label: "المياه" },
  { keywords: /stc|اس تي سي|موبايلي|mobily|زين|zain|جوال|اتصالات|إنترنت|internet/i, itemId: "phone_internet", group: "fixed", label: "جوال وإنترنت" },
  { keywords: /netflix|نتفلكس|shahid|شاهد|spotify|osn|اشتراك|subscription/i, itemId: "subscriptions", group: "fixed", label: "اشتراكات" },
];

// ————————————————————————————————————————————————
// المحلّل الرئيسي لرسالة واحدة
// ————————————————————————————————————————————————
export function parseSms(raw: string): ParsedSms | null {
  if (!raw || raw.trim().length < 8) return null;
  const text = raw.trim();
  const lower = text;

  const bank = detectBank(text);
  const party = extractParty(text);
  const dateISO = extractDate(text);
  const balance = extractBalance(text);
  const fees = extractFees(text);

  // ————— تحديد النوع (دخل/مصروف) من الكلمات المفتاحية —————
  const isIncome =
    /إيداع|ايداع|واردة|وارد|حوالة محلية واردة|إيداع حوالة واردة|راتب|استرداد|refund|deposit/i.test(
      lower,
    );
  const isOutgoingTransfer = /حوالة صادرة|صادرة/i.test(lower);
  const isPurchase = /شراء|نقاط بيع|point of sale|purchase|مشتريات/i.test(lower);
  const isInstallment = /قسط|خصم\s*[:：]?\s*قسط|installment/i.test(lower);
  const isWithdrawal = /سحب|withdrawal|صراف/i.test(lower);

  let kind: SmsKind;
  if (isIncome && !isOutgoingTransfer) kind = "income";
  else kind = "expense";

  // ————— استخراج المبلغ (نفضّل المبلغ المُعَنوَن) —————
  let amount =
    extractLabeledAmount(text, ["مبلغ", "بمبلغ", "القسط", "قسط تمويل"]) ??
    extractAmount(text);

  if (amount == null || amount <= 0) return null;

  // ————— التصنيف المقترح —————
  let suggestedItemId = "";
  let suggestedGroup: GroupKey = "variable";
  let suggestedLabel = "";
  let confidence: ParsedSms["confidence"] = "low";
  let reason = "";

  if (kind === "income") {
    // تمييز الراتب من الجهات الحكومية/جهة العمل
    const isSalary =
      /راتب|مجلس الضمان|الضمان الصحي|payroll|salary|رواتب|جهة العمل|شركة/i.test(lower);
    if (isSalary) {
      suggestedItemId = "salary";
      suggestedGroup = "income";
      suggestedLabel = "الراتب الشهري";
      confidence = "high";
      reason = "حوالة واردة من جهة تبدو راتباً (مثل جهة حكومية/جهة عمل).";
    } else {
      suggestedItemId = "extra_income";
      suggestedGroup = "income";
      suggestedLabel = "دخل إضافي";
      confidence = "medium";
      reason = party
        ? `إيداع/حوالة واردة من ${party} — صُنّف كدخل إضافي.`
        : "إيداع/حوالة واردة — صُنّف كدخل إضافي.";
    }
  } else {
    // مصروف: نحاول مطابقة الجهة بقاموس التصنيف
    const haystack = `${party ?? ""} ${text}`;
    const matched = EXPENSE_MERCHANT_RULES.find((r) => r.keywords.test(haystack));
    if (matched) {
      suggestedItemId = matched.itemId;
      suggestedGroup = matched.group;
      suggestedLabel = matched.label;
      confidence = "high";
      reason = `${
        isInstallment ? "قسط" : isPurchase ? "شراء" : "عملية"
      } لدى «${party ?? matched.label}» → ${matched.label}.`;
    } else if (isInstallment) {
      // قسط بدون جهة معروفة → التزام آخر
      suggestedItemId = "other_debt";
      suggestedGroup = "debt";
      suggestedLabel = "التزام آخر";
      confidence = "medium";
      reason = "خصم قسط تمويل — صُنّف ضمن الالتزامات.";
    } else if (isOutgoingTransfer) {
      suggestedItemId = "other_var";
      suggestedGroup = "variable";
      suggestedLabel = "مصاريف أخرى";
      confidence = "medium";
      reason = party
        ? `حوالة صادرة إلى ${party} — صُنّفت ضمن المصاريف المتغيرة.`
        : "حوالة صادرة — صُنّفت ضمن المصاريف المتغيرة.";
    } else if (isWithdrawal) {
      suggestedItemId = "other_var";
      suggestedGroup = "variable";
      suggestedLabel = "مصاريف أخرى";
      confidence = "low";
      reason = "سحب نقدي — صُنّف ضمن المصاريف المتغيرة.";
    } else if (isPurchase) {
      suggestedItemId = "other_var";
      suggestedGroup = "variable";
      suggestedLabel = "مصاريف أخرى";
      confidence = "low";
      reason = party
        ? `شراء لدى ${party} — لم نتعرّف على التصنيف، اقتُرح كمصاريف أخرى.`
        : "شراء غير معروف — اقتُرح كمصاريف أخرى.";
    } else {
      suggestedItemId = "other_var";
      suggestedGroup = "variable";
      suggestedLabel = "مصاريف أخرى";
      confidence = "low";
      reason = "لم نتعرّف على نوع العملية بدقة — راجعها قبل الإضافة.";
    }
  }

  return {
    raw: text,
    bank,
    kind,
    amount,
    party,
    dateISO,
    balance,
    fees,
    suggestedItemId,
    suggestedGroup,
    suggestedLabel,
    confidence,
    reason,
  };
}

// ————————————————————————————————————————————————
// فلتر: هل يبدو النص رسالة بنكية أصلاً؟ (لتصفية رسائل OTP والرسائل الشخصية)
// ————————————————————————————————————————————————
export function looksLikeBankSms(raw: string): boolean {
  if (!raw) return false;
  const t = raw;
  // نستبعد رسائل رمز التحقق OTP
  if (/رمز التحقق|رمز الدخول|otp|verification code|كلمة المرور المؤقتة/i.test(t)) return false;
  // يجب أن تحتوي على مبلغ + إحدى كلمات العمليات
  const hasAmount = /(?:SAR|SR|ريال)\s*[0-9]|[0-9][\d,]*\.\d{2}\s*(?:SAR|SR)/i.test(t);
  const hasKeyword =
    /شراء|حوالة|إيداع|ايداع|خصم|قسط|سحب|راتب|نقاط بيع|purchase|transfer|deposit/i.test(t);
  return hasAmount && hasKeyword;
}

// معرّف بسيط لتفادي تكرار نفس الرسالة (بصمة مبنية على المبلغ + التاريخ + جزء من النص)
export function smsFingerprint(p: ParsedSms): string {
  const base = `${p.amount}|${p.dateISO ?? ""}|${p.party ?? ""}|${p.raw.slice(0, 40)}`;
  let h = 0;
  for (let i = 0; i < base.length; i++) {
    h = (h << 5) - h + base.charCodeAt(i);
    h |= 0;
  }
  return `sms_${Math.abs(h)}`;
}
