import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { FinanceState, SEED_STATE, LineItem, SavingGoal, Transaction } from "@/lib/financeData";
import { IS_DEMO_BUILD } from "@/lib/buildFlags";

const STORAGE_KEY = "wealth_tracker_state_v1";

interface FinanceContextValue {
  state: FinanceState;
  setMonth: (month: number) => void;
  updateActual: (itemId: string, month: number, value: number) => void;
  addToActual: (itemId: string, month: number, delta: number) => void;
  // إضافة حركة مفصّلة (تُحدّث الإجمالي وتحفظ التفصيل معاً) — تُستخدم عند تأكيد رسالة بنكية
  addTransaction: (
    itemId: string,
    month: number,
    amount: number,
    note: string,
    source: "sms" | "manual",
    dateISO?: string,
  ) => void;
  // حذف حركة مفصّلة وطرح مبلغها من إجمالي البند تلقائياً
  removeTransaction: (transactionId: string) => void;
  // نقل حركة (ومبلغها) من بندها الحالي إلى بند آخر — يحافظ على وصف الرسالة والتاريخ
  moveTransaction: (transactionId: string, newItemId: string) => void;
  transactionsFor: (itemId: string, month: number) => Transaction[];
  updateTarget: (itemId: string, value: number) => void;
  updateName: (itemId: string, name: string) => void;
  updateGoalTotal: (goalId: string, total: number) => void;
  resetAll: () => void;
  clearData: () => void;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

// نسخة فارغة (كل المبالغ الشهرية صفر، تبقى البنود والأهداف بأسمائها الافتراضية)
function emptyState(): FinanceState {
  const base = structuredClone(SEED_STATE);
  base.items = base.items.map((i) => ({ ...i, target: 0, monthly: Array(12).fill(0) }));
  base.savingGoals = base.savingGoals.map((g) => ({ ...g, total: 0 }));
  base.transactions = [];
  return base;
}

// الحالة الابتدائية بحسب نوع البناء: النسخة الشخصية ببيانات كاملة، والتجريبية فارغة
function initialSeed(): FinanceState {
  return IS_DEMO_BUILD ? emptyState() : structuredClone(SEED_STATE);
}

function loadState(): FinanceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialSeed();
    const parsed = JSON.parse(raw) as FinanceState;
    // دمج بسيط للتأكد من اكتمال البنية
    if (!parsed.items || !Array.isArray(parsed.items)) return initialSeed();
    if (typeof parsed.currentMonth !== "number") parsed.currentMonth = SEED_STATE.currentMonth;
    if (!parsed.savingGoals) parsed.savingGoals = structuredClone(SEED_STATE.savingGoals);
    // توافق مع بيانات محفوظة قبل إضافة سجل الحركات
    if (!parsed.transactions || !Array.isArray(parsed.transactions)) parsed.transactions = [];
    return parsed;
  } catch {
    return initialSeed();
  }
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FinanceState>(() => loadState());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // تجاهل أخطاء التخزين
    }
  }, [state]);

  const setMonth = useCallback((month: number) => {
    setState((s) => ({ ...s, currentMonth: month }));
  }, []);

  const updateActual = useCallback((itemId: string, month: number, value: number) => {
    setState((s) => ({
      ...s,
      items: s.items.map((i) =>
        i.id === itemId
          ? { ...i, monthly: i.monthly.map((v, idx) => (idx === month ? value : v)) }
          : i,
      ),
    }));
  }, []);

  // إضافة مبلغ تراكمياً للقيمة الحالية (يُستخدم عند تأكيد رسالة بنكية)
  const addToActual = useCallback((itemId: string, month: number, delta: number) => {
    setState((s) => ({
      ...s,
      items: s.items.map((i) =>
        i.id === itemId
          ? {
              ...i,
              monthly: i.monthly.map((v, idx) =>
                idx === month ? Math.max(0, (v || 0) + delta) : v,
              ),
            }
          : i,
      ),
    }));
  }, []);

  // إضافة حركة مفصّلة: تزيد إجمالي البند وتحفظ التفصيل (الجهة/السبب) في السجل معاً
  const addTransaction = useCallback(
    (
      itemId: string,
      month: number,
      amount: number,
      note: string,
      source: "sms" | "manual",
      dateISO?: string,
    ) => {
      setState((s) => {
        const tx: Transaction = {
          id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          itemId,
          month,
          amount,
          note,
          source,
          dateISO: dateISO ?? new Date().toISOString(),
        };
        return {
          ...s,
          items: s.items.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  monthly: i.monthly.map((v, idx) =>
                    idx === month ? Math.max(0, (v || 0) + amount) : v,
                  ),
                }
              : i,
          ),
          transactions: [...s.transactions, tx],
        };
      });
    },
    [],
  );

  // حذف حركة مفصّلة وطرح مبلغها من إجمالي البند تلقائياً (لتصحيح تصنيف خاطئ)
  const removeTransaction = useCallback((transactionId: string) => {
    setState((s) => {
      const tx = s.transactions.find((t) => t.id === transactionId);
      if (!tx) return s;
      return {
        ...s,
        items: s.items.map((i) =>
          i.id === tx.itemId
            ? {
                ...i,
                monthly: i.monthly.map((v, idx) =>
                  idx === tx.month ? Math.max(0, (v || 0) - tx.amount) : v,
                ),
              }
            : i,
        ),
        transactions: s.transactions.filter((t) => t.id !== transactionId),
      };
    });
  }, []);

  // نقل حركة من بندها الحالي إلى بند آخر: يطرح المبلغ من القديم، يضيفه للجديد،
  // ويُحدّث itemId في سجل الحركة نفسها فيبقى وصف الرسالة (اسم الجهة) والتاريخ كما هو.
  const moveTransaction = useCallback((transactionId: string, newItemId: string) => {
    setState((s) => {
      const tx = s.transactions.find((t) => t.id === transactionId);
      if (!tx || tx.itemId === newItemId) return s;
      return {
        ...s,
        items: s.items.map((i) => {
          if (i.id === tx.itemId) {
            return {
              ...i,
              monthly: i.monthly.map((v, idx) =>
                idx === tx.month ? Math.max(0, (v || 0) - tx.amount) : v,
              ),
            };
          }
          if (i.id === newItemId) {
            return {
              ...i,
              monthly: i.monthly.map((v, idx) =>
                idx === tx.month ? Math.max(0, (v || 0) + tx.amount) : v,
              ),
            };
          }
          return i;
        }),
        transactions: s.transactions.map((t) =>
          t.id === transactionId ? { ...t, itemId: newItemId } : t,
        ),
      };
    });
  }, []);

  const transactionsFor = useCallback(
    (itemId: string, month: number) => {
      return state.transactions
        .filter((t) => t.itemId === itemId && t.month === month)
        .sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime());
    },
    [state.transactions],
  );

  const updateTarget = useCallback((itemId: string, value: number) => {
    setState((s) => ({
      ...s,
      items: s.items.map((i) => (i.id === itemId ? { ...i, target: value } : i)),
    }));
  }, []);

  const updateName = useCallback((itemId: string, name: string) => {
    setState((s) => ({
      ...s,
      items: s.items.map((i) => (i.id === itemId ? { ...i, name } : i)),
    }));
  }, []);

  const updateGoalTotal = useCallback((goalId: string, total: number) => {
    setState((s) => ({
      ...s,
      savingGoals: s.savingGoals.map((g) => (g.id === goalId ? { ...g, total } : g)),
    }));
  }, []);

  const resetAll = useCallback(() => {
    setState(initialSeed());
  }, []);

  const clearData = useCallback(() => {
    setState(emptyState());
  }, []);

  const value = useMemo<FinanceContextValue>(
    () => ({
      state,
      setMonth,
      updateActual,
      addToActual,
      addTransaction,
      removeTransaction,
      moveTransaction,
      transactionsFor,
      updateTarget,
      updateName,
      updateGoalTotal,
      resetAll,
      clearData,
    }),
    [
      state,
      setMonth,
      updateActual,
      addToActual,
      addTransaction,
      removeTransaction,
      moveTransaction,
      transactionsFor,
      updateTarget,
      updateName,
      updateGoalTotal,
      resetAll,
      clearData,
    ],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used within FinanceProvider");
  return ctx;
}

export type { LineItem, SavingGoal };
