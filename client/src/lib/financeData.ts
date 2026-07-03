// نموذج البيانات المالية - مُستخرج بالكامل من ملف الإكسل "نظام إدارة الثروة الشخصية"
// كل القيم بالريال السعودي (﷼)

export const MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
] as const;

// مجموعات البنود — تطابق أقسام الإكسل
export type GroupKey =
  | "income" // الدخل والاستثمارات
  | "fixed" // الفواتير الثابتة
  | "debt" // الالتزامات والديون
  | "variable" // المصاريف المتغيرة
  | "savings"; // الادخار والأهداف المالية

export interface GroupMeta {
  key: GroupKey;
  title: string;
  // اتجاه التقييم: الأعلى أفضل للدخل والادخار، الأقل/الوصول للهدف للباقي
  evaluation: "higher_better" | "reach_target" | "lower_better";
  hint: string;
}

export const GROUPS: GroupMeta[] = [
  {
    key: "income",
    title: "الدخل والاستثمارات",
    evaluation: "higher_better",
    hint: "الأعلى أفضل — زيادة عن الهدف تعني أداء جيد.",
  },
  {
    key: "fixed",
    title: "الفواتير الثابتة",
    evaluation: "reach_target",
    hint: "يجب الوصول للهدف — أقل من الهدف يعني نقص في السداد.",
  },
  {
    key: "debt",
    title: "الالتزامات والديون",
    evaluation: "reach_target",
    hint: "يجب الوصول للهدف — أقل من الهدف يعني نقص في السداد.",
  },
  {
    key: "variable",
    title: "المصاريف المتغيرة",
    evaluation: "lower_better",
    hint: "الأقل أفضل — التجاوز عن الهدف يعتبر مشكلة.",
  },
  {
    key: "savings",
    title: "الادخار والأهداف المالية",
    evaluation: "higher_better",
    hint: "الأعلى أفضل — زيادة عن الهدف تعني أداء جيد.",
  },
];

export interface LineItem {
  id: string;
  name: string;
  group: GroupKey;
  target: number; // الهدف / الميزانية الشهرية
  monthly: number[]; // 12 قيمة، واحدة لكل شهر
}

export interface SavingGoal {
  id: string; // يطابق id بند الادخار
  name: string;
  total: number; // الهدف الكلي للتجميع
}

export interface FinanceState {
  items: LineItem[];
  savingGoals: SavingGoal[];
  currentMonth: number; // 0-11
}

const m = (v: number) => Array(12).fill(v);
// مصفوفة شهرية مخصصة: تبدأ من يناير
const arr = (vals: number[]) => {
  const out = vals.slice(0, 12);
  while (out.length < 12) out.push(0);
  return out;
};

// البيانات الابتدائية — منسوخة حرفياً من ورقة "المدخلات الشهرية"
export const SEED_STATE: FinanceState = {
  currentMonth: 6, // يوليو (الشهر المعروض افتراضياً في الإكسل)
  items: [
    // الدخل والاستثمارات
    { id: "salary", name: "الراتب الشهري", group: "income", target: 25000, monthly: m(25000) },
    { id: "freelance", name: "عمل حر", group: "income", target: 0, monthly: m(0) },
    { id: "invest_income", name: "دخل من الاستثمار", group: "income", target: 0, monthly: m(0) },
    { id: "extra_income", name: "دخل إضافي", group: "income", target: 0, monthly: m(0) },

    // الفواتير الثابتة
    {
      id: "electricity",
      name: "الكهرباء",
      group: "fixed",
      target: 500,
      monthly: arr([657, 657, 657, 657, 657, 657, 657, 500, 500, 500, 500, 500]),
    },
    {
      id: "water",
      name: "المياه",
      group: "fixed",
      target: 248,
      monthly: arr([248, 248, 248, 248, 248, 248, 0, 248, 248, 248, 248, 248]),
    },
    {
      id: "phone_internet",
      name: "جوال وإنترنت",
      group: "fixed",
      target: 860,
      monthly: arr([1310, 1310, 1310, 1310, 1310, 1310, 1310, 860, 860, 860, 860, 860]),
    },
    { id: "subscriptions", name: "اشتراكات", group: "fixed", target: 0, monthly: m(0) },
    { id: "rent", name: "الإيجار", group: "fixed", target: 0, monthly: m(0) },
    { id: "other_bill", name: "فاتورة أخرى", group: "fixed", target: 0, monthly: m(0) },

    // الالتزامات والديون
    { id: "mortgage", name: "قرض عقاري", group: "debt", target: 2971, monthly: m(2971) },
    { id: "car_loan", name: "قرض سيارة", group: "debt", target: 5058, monthly: m(5058) },
    { id: "credit_card", name: "فيزا / ماستركارد", group: "debt", target: 0, monthly: m(0) },
    {
      id: "bnpl",
      name: "تابي / تمارا",
      group: "debt",
      target: 0,
      monthly: arr([486, 486, 486, 486, 486, 486, 486, 0, 0, 0, 0, 0]),
    },
    { id: "other_debt", name: "التزام آخر", group: "debt", target: 1950, monthly: m(1950) },

    // المصاريف المتغيرة
    { id: "groceries", name: "مقاضي البيت", group: "variable", target: 2500, monthly: m(2500) },
    { id: "fuel", name: "بنزين ومواصلات", group: "variable", target: 500, monthly: m(500) },
    { id: "delivery", name: "تطبيقات توصيل", group: "variable", target: 500, monthly: m(500) },
    { id: "dining", name: "مطاعم وكافيهات", group: "variable", target: 500, monthly: m(500) },
    { id: "pharmacy", name: "صيدلية وعلاج", group: "variable", target: 400, monthly: m(400) },
    {
      id: "other_var",
      name: "مصاريف أخرى",
      group: "variable",
      target: 500,
      monthly: arr([500, 500, 500, 500, 500, 500, 500, 0, 0, 0, 0, 0]),
    },

    // الادخار والأهداف المالية
    { id: "emergency", name: "ادخار طوارئ", group: "savings", target: 0, monthly: m(0) },
    { id: "travel", name: "ادخار سفر", group: "savings", target: 0, monthly: m(0) },
    { id: "wedding", name: "ادخار للزواج", group: "savings", target: 0, monthly: m(0) },
    { id: "other_saving", name: "ادخار أخرى", group: "savings", target: 2100, monthly: m(2100) },
  ],
  // أهداف الادخار الكلية (من ورقة الأهداف والمؤشرات)
  savingGoals: [
    { id: "emergency", name: "ادخار طوارئ", total: 0 },
    { id: "travel", name: "ادخار سفر", total: 0 },
    { id: "wedding", name: "ادخار للزواج", total: 0 },
    { id: "other_saving", name: "ادخار أخرى", total: 0 },
  ],
};
