// تخزين حالة معالجة الرسائل البنكية (مؤكّدة/مرفوضة) محلياً لتفادي إعادة اقتراح نفس الرسالة
const KEY = "wealth_tracker_sms_processed_v1";

export type SmsStatus = "added" | "ignored";

interface ProcessedMap {
  [fingerprint: string]: SmsStatus;
}

export function loadProcessed(): ProcessedMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ProcessedMap;
  } catch {
    return {};
  }
}

export function saveProcessed(map: ProcessedMap): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // تجاهل
  }
}

export function markProcessed(fingerprint: string, status: SmsStatus): void {
  const map = loadProcessed();
  map[fingerprint] = status;
  saveProcessed(map);
}

export function getStatus(fingerprint: string): SmsStatus | undefined {
  return loadProcessed()[fingerprint];
}
