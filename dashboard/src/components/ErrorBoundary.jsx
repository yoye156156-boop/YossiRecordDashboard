import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, err: null };
  }
  static getDerivedStateFromError(err) {
    return { hasError: true, err };
  }
  componentDidCatch(error, errorInfo) {
    // אפשר להוסיף כאן שליחה לשרת לוגים
    console.error("React ErrorBoundary:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ direction: "rtl", color: "#b91c1c", padding: "12px" }}>
          <strong>אופס…</strong> קרתה שגיאה לא צפויה בממשק. אפשר לנסות רענון.
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
            {String(this.state.err)}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
