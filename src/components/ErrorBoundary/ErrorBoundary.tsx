import { Component, type ErrorInfo, type ReactNode } from "react";
import { useI18n } from "../../i18n";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("VibeHub crashed:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}

function ErrorFallback() {
  const { t } = useI18n();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        minHeight: "100vh",
        padding: 24,
        textAlign: "center",
      }}
    >
      <h1 style={{ margin: 0 }}>{t("error.title")}</h1>
      <p style={{ margin: 0, opacity: 0.7 }}>{t("error.description")}</p>
      <button type="button" onClick={() => window.location.reload()}>
        {t("error.reload")}
      </button>
    </div>
  );
}
