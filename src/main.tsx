import { Toaster } from "@/components/ui/sonner";

// Service Worker registration disabled for now - will be implemented with proper build process
// if ("serviceWorker" in navigator) {
//   window.addEventListener("load", () => {
//     navigator.serviceWorker.register("/sw.js").catch(() => {});
//   });
// }

import { Component, StrictMode, useEffect } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import "./index.css";
import "./types/global.d.ts";
import { ThemeProvider } from "next-themes";
import { FontSizeProvider } from "@/lib/fontSize";
import LandingNew from "./pages/LandingNew.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import NotFound from "./pages/NotFound.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);
  return null;
}

/* ═══════════════════════════════════════════════════════════════
   Error Boundary
   ═══════════════════════════════════════════════════════════════ */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
          <Card className="max-w-md w-full border shadow-lg">
            <CardHeader className="text-center">
              <AlertTriangle className="size-12 text-amber-500 mx-auto mb-2" />
              <CardTitle className="text-lg">خطا در بارگذاری</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground text-sm">
                {this.state.error?.message?.substring(0, 200)}
              </p>
              <Button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="gap-2 w-full"
              >
                <RefreshCw className="size-4" />
                تلاش مجدد
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  return (
    <BrowserRouter>
      <RouteSyncer />
      <Routes>
        <Route path="/" element={<LandingNew />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      disableTransitionOnChange
    >
      <FontSizeProvider>
        <AppErrorBoundary>
          <AppContent />
        </AppErrorBoundary>
        <Toaster />
      </FontSizeProvider>
    </ThemeProvider>
  </StrictMode>,
);
