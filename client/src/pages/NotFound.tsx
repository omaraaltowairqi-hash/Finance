import { Link } from "wouter";

export default function NotFound() {
  return (
    <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-5xl font-bold">404</h1>
      <p className="text-muted-foreground">الصفحة غير موجودة</p>
      <Link href="/" className="underline text-primary">العودة للرئيسية</Link>
    </div>
  );
}
