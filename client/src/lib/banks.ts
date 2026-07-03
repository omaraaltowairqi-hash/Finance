// قائمة البنوك السعودية المدعومة + أسماء المُرسِلين (SMS sender IDs) لكل بنك
// تُستخدم لتصفية الرسائل: نقرأ فقط رسائل البنوك التي اختارها المستخدم.
// كل بنك له عدة أسماء مُرسِل محتملة (عربي/إنجليزي) لأن أسماء SMS تختلف.

export interface BankDef {
  id: string; // معرّف داخلي
  name: string; // الاسم العربي المعروض
  // أنماط تطابق اسم المُرسِل (address) في الرسالة — غير حساسة لحالة الأحرف
  senderPatterns: RegExp;
}

// ملاحظة: المحلّل الحالي (smsParser) يميّز الراجحي و SAB بدقة عالية،
// وبقية البنوك تُحلَّل بنفس القواعد العامة (مبلغ + نوع العملية + الجهة).
export const BANKS: BankDef[] = [
  {
    id: "rajhi",
    name: "مصرف الراجحي",
    senderPatterns: /الراجحي|rajhi|alrajhi/i,
  },
  {
    id: "sab",
    name: "البنك الأول (SAB)",
    senderPatterns: /\bsab\b|الأول|الاول|alfursan|saudi\s*awwal/i,
  },
  {
    id: "alahli",
    name: "الأهلي السعودي (SNB)",
    senderPatterns: /الأهلي|الاهلي|\bsnb\b|alahli|ncb|البنك الأهلي/i,
  },
  {
    id: "riyad",
    name: "بنك الرياض",
    senderPatterns: /الرياض|riyad\s*bank|riyadbank/i,
  },
  {
    id: "inma",
    name: "مصرف الإنماء",
    senderPatterns: /الإنماء|الانماء|inma|alinma/i,
  },
  {
    id: "albilad",
    name: "بنك البلاد",
    senderPatterns: /البلاد|albilad|bilad/i,
  },
  {
    id: "aljazira",
    name: "بنك الجزيرة",
    senderPatterns: /الجزيرة|aljazira|jazira/i,
  },
  {
    id: "anb",
    name: "البنك العربي الوطني (ANB)",
    senderPatterns: /العربي الوطني|\banb\b|arab national/i,
  },
  {
    id: "fransi",
    name: "البنك السعودي الفرنسي",
    senderPatterns: /الفرنسي|fransi|bsf/i,
  },
  {
    id: "gulf",
    name: "بنك الخليج الدولي (GIB)",
    senderPatterns: /الخليج|\bgib\b|gulf international/i,
  },
  {
    id: "stcpay",
    name: "STC Pay",
    senderPatterns: /stc\s*pay|stcpay|اس تي سي باي/i,
  },
  {
    id: "urpay",
    name: "urpay",
    senderPatterns: /urpay|يور باي/i,
  },
];

const STORAGE_KEY = "wealth_tracker_selected_banks_v1";

// افتراضياً لا شيء مُختار → المستخدم يختار في أول استخدام
export function loadSelectedBanks(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr.filter((x) => typeof x === "string");
    return [];
  } catch {
    return [];
  }
}

export function saveSelectedBanks(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // تجاهل
  }
}

// هل تم إعداد البنوك من قبل؟ (نميّز "لم يُعدّ بعد" عن "اختار لا شيء")
export function hasConfiguredBanks(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

// يطابق اسم مُرسِل الرسالة مع البنوك المختارة.
// إذا لم يُطابق أي بنك معروف لكن النص يبدو بنكياً، نعيد true فقط إذا سمح المستخدم بذلك.
export function messageMatchesSelectedBanks(
  address: string,
  body: string,
  selectedBankIds: string[],
): boolean {
  if (selectedBankIds.length === 0) return true; // لا فلترة إن لم يُختر شيء
  const haystack = `${address || ""} ${body || ""}`;
  for (const id of selectedBankIds) {
    const bank = BANKS.find((b) => b.id === id);
    if (bank && bank.senderPatterns.test(haystack)) return true;
  }
  return false;
}
