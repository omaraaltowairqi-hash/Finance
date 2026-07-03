// عناصر بصرية صغيرة مشتركة بأسلوب الدفتر الهادئ
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { fmt } from "@/lib/calculations";

// عدّاد رقمي تصاعدي خفيف
export function AnimatedNumber({
  value,
  className,
  duration = 600,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const raf = useRef<number>(0);

  useEffect(() => {
    const start = prev.current;
    const delta = value - start;
    if (delta === 0) {
      setDisplay(value);
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(value);
      prev.current = value;
      return;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(start + delta * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else prev.current = value;
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  return <span className={cn("tabular font-display", className)}>{fmt(display)}</span>;
}

export function Riyal({ className }: { className?: string }) {
  return <span className={cn("opacity-70", className)}>﷼</span>;
}

type StatusTone = "good" | "bad" | "warning" | "neutral";

export function StatusBadge({
  tone,
  children,
}: {
  tone: StatusTone;
  children: React.ReactNode;
}) {
  const tones: Record<StatusTone, string> = {
    good: "bg-positive/12 text-positive border-positive/25",
    bad: "bg-destructive/12 text-destructive border-destructive/25",
    warning: "bg-warning/15 text-warning-foreground border-warning/30",
    neutral: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

// قضيب تقدّم رفيع
export function ThinBar({
  value,
  tone = "olive",
  className,
}: {
  value: number; // 0..1
  tone?: "olive" | "terracotta" | "gold";
  className?: string;
}) {
  const colors = {
    olive: "bg-primary",
    terracotta: "bg-destructive",
    gold: "bg-gold",
  };
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-700", colors[tone])}
        style={{ width: `${pct}%`, transitionTimingFunction: "var(--ease-out)" }}
      />
    </div>
  );
}

// عنوان قسم بأسلوب دفتر
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {children}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
