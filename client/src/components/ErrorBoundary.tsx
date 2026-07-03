import React from "react";

interface Props { children: React.ReactNode }
interface State { hasError: boolean; message?: string }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }
  componentDidCatch(error: Error) {
    console.error("ErrorBoundary caught:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div dir="rtl" style={{ padding: 24, textAlign: "center", fontFamily: "sans-serif" }}>
          <h2>حدث خطأ غير متوقع 😕</h2>
          <p style={{ color: "#888", fontSize: 14 }}>{this.state.message}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, padding: "8px 24px", borderRadius: 8, border: "1px solid #ccc", background: "#fff" }}
          >
            إعادة تحميل التطبيق
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
