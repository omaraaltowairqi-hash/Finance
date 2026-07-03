// جسر TypeScript للتواصل مع إضافة قراءة الرسائل الأصلية (Android)
// على الويب (المتصفح) لا توجد رسائل حقيقية، فنوفّر بيانات تجريبية للمعاينة فقط.

import { registerPlugin, Capacitor } from "@capacitor/core";
import { messageMatchesSelectedBanks } from "./banks";

export interface RawSms {
  address: string; // مُرسِل الرسالة (اسم/رقم)
  body: string; // نص الرسالة
  date: number; // وقت الوصول (ميلي ثانية)
}

export interface SmsReaderPlugin {
  checkPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
  readInbox(options?: { limit?: number; sinceTimestamp?: number }): Promise<{
    messages: RawSms[];
  }>;
}

const SmsReader = registerPlugin<SmsReaderPlugin>("SmsReader");

export function isNativeAndroid(): boolean {
  return Capacitor.getPlatform() === "android";
}

// رسائل تجريبية للمعاينة على المتصفح (تطابق نماذج المستخدم الفعلية)
const DEMO_MESSAGES: RawSms[] = [
  {
    address: "SAB",
    date: Date.now() - 1000 * 60 * 30,
    body: `شراء عبر الإنترنت
باستخدام بطاقة الأول Mastercard Alfursan الائتمانية (5037) بمبلغ SAR 289.00 لدى Tamara من خلال Apple Pay
تاريخ: 2026-06-30 09:47:02
الرصيد: SAR 19103.58`,
  },
  {
    address: "SAB",
    date: Date.now() - 1000 * 60 * 60,
    body: `حوالة صادرة مقبولة
من: **7001
إلى: سعد عبدالعزيز
آيبان: **9940
بنك الرياض
مبلغ: SAR 600.00
رسوم: SAR 0.57
في: 2026-06-30 17:51:36`,
  },
  {
    address: "AlRajhiBank",
    date: Date.now() - 1000 * 60 * 90,
    body: `خصم: قسط تمويل
من: ***0167
القسط: 2,828.90 SAR
المبلغ المتبقي: 1,236,541.80
لـ: تمويل منازل
في: 2026-06-29 20:36:16`,
  },
  {
    address: "AlRajhiBank",
    date: Date.now() - 1000 * 60 * 120,
    body: `إيداع حوالة واردة
من: OMAR ABDULRAHMAN ABED ALTOWAIRQI
إلى: **7001
آيبان: **9789
مصرف الراجحي
مبلغ: SAR 20000.00
في: 2026-06-28 20:40:54`,
  },
  {
    address: "AlRajhiBank",
    date: Date.now() - 1000 * 60 * 150,
    body: `حوالة محلية واردة بـSR 25262.68
لـ9789
من;مجلس الضمان الصحي التعاوني
26/6/28 01:50`,
  },
  // ملاحظة: address يحمل اسم المُرسِل ليُستخدم في فلترة البنوك المختارة
  {
    address: "AlinmaBank",
    date: Date.now() - 1000 * 60 * 180,
    body: `شراء نقاط بيع
بطاقة مدى (4211)
مبلغ SAR 156.50 لدى بندة
في: 2026-06-27 14:22:10`,
  },
  {
    address: "RiyadBank",
    date: Date.now() - 1000 * 60 * 200,
    body: `إيداع راتب
مبلغ SAR 12000.00
من: شركة التقنية المتقدمة
في: 2026-06-25 08:00:00`,
  },
  {
    // رسالة OTP — يجب أن يتجاهلها الفلتر
    address: "SAB",
    date: Date.now() - 1000 * 60 * 5,
    body: `رمز التحقق الخاص بك هو 458213 لا تشاركه مع أحد.`,
  },
];

export async function checkSmsPermission(): Promise<boolean> {
  if (!isNativeAndroid()) return true; // على الويب نعتبرها ممنوحة (وضع معاينة)
  try {
    const { granted } = await SmsReader.checkPermission();
    return granted;
  } catch {
    return false;
  }
}

export async function requestSmsPermission(): Promise<boolean> {
  if (!isNativeAndroid()) return true;
  try {
    const { granted } = await SmsReader.requestPermission();
    return granted;
  } catch {
    return false;
  }
}

export async function readInboxMessages(options?: {
  limit?: number;
  sinceTimestamp?: number;
  banks?: string[]; // معرّفات البنوك المختارة — تُقرأ رسائلها فقط
}): Promise<RawSms[]> {
  const banks = options?.banks ?? [];
  const filterByBank = (msgs: RawSms[]) =>
    msgs.filter((m) => messageMatchesSelectedBanks(m.address, m.body, banks));

  if (!isNativeAndroid()) {
    // وضع المعاينة على المتصفح
    return new Promise((resolve) =>
      setTimeout(() => resolve(filterByBank(DEMO_MESSAGES)), 400),
    );
  }
  try {
    const { messages } = await SmsReader.readInbox(options);
    return filterByBank(messages ?? []);
  } catch {
    return [];
  }
}
