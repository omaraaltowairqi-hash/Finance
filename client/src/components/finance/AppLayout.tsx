import { Link, useLocation } from "wouter";
import { LayoutDashboard, PencilLine, MessageSquareText, ChartPie, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const LOGO = "./assets/logo.png";

const TABS = [
  { path: "/", label: "الرئيسية", icon: LayoutDashboard },
  { path: "/entry", label: "الإدخال", icon: PencilLine },
  { path: "/sms", label: "الرسائل", icon: MessageSquareText },
  { path: "/insights", label: "المؤشرات", icon: ChartPie },
  { path: "/settings", label: "الإعدادات", icon: Settings },
];

export function BrandHeader({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
        <img src={LOGO} alt="شعار التطبيق" className="h-8 w-8 object-contain" />
      </div>
      <div className="leading-tight">
        <h1 className="font-display text-lg font-extrabold tracking-tight">دفتري المالي</h1>
        <p className="text-[11px] text-muted-foreground">{subtitle ?? "تتبّع دخلك ومصاريفك بهدوء"}</p>
      </div>
    </div>
  );
}

export function BottomNav() {
  const [location] = useLocation();
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
      <div className="pointer-events-auto mx-auto w-full max-w-[30rem] px-3 pb-3">
        <div className="flex items-center justify-around rounded-2xl border border-border bg-card/95 px-1 py-1.5 shadow-lg shadow-black/5 backdrop-blur-xl">
          {TABS.map((tab) => {
            const active = location === tab.path;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.path}
                href={tab.path}
                className={cn(
                  "btn-press flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
                <span className={cn("text-[10px]", active ? "font-bold" : "font-medium")}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell bg-background pb-24">
      <div className="px-4 pt-5">{children}</div>
      <BottomNav />
    </div>
  );
}
