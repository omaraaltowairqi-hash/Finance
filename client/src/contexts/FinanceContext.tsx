import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { FinanceState, SEED_STATE, LineItem, SavingGoal } from "@/lib/financeData";
import { IS_DEMO_BUILD } from "@/lib/buildFlags";

const STORAGE_KEY = "wealth_tracker_state_v1";

interface FinanceContextValue {
  state: FinanceState;
  setMonth: (month: number) => void;
  updateActual: (itemId: string, month: number, value: number) => void;
  addToActual: (itemId: string, month: number, delta: number) => void;
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
      updateTarget,
      updateName,
      updateGoalTotal,
      resetAll,
      clearData,
    }),
    [state, setMonth, updateActual, addToActual, updateTarget, updateName, updateGoalTotal, resetAll, clearData],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used within FinanceProvider");
  return ctx;
}

export type { LineItem, SavingGoal };
