/**
 * Async Error Boundary with Retry Logic for API calls and async operations
 * Supports automatic retries with exponential backoff
 */
import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, ChevronDown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  tabName?: string;
  maxRetries?: number;
  retryDelay?: number; // Base delay in ms
  onError?: (error: Error, retryCount: number) => void;
  onRetry?: (retryCount: number) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  isRetrying: boolean;
  showDetails: boolean;
  lastErrorTime: number | null;
}

export class AsyncErrorBoundary extends Component<Props, State> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
      isRetrying: false,
      showDetails: false,
      lastErrorTime: null,
    };
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, lastErrorTime: Date.now() };
  }

  componentDidCatch(error: Error) {
    console.error(
      `[AsyncErrorBoundary${this.props.tabName ? ` - ${this.props.tabName}` : ""}]:`,
      error
    );
    this.props.onError?.(error, this.state.retryCount);
    
    // Auto-retry logic
    const maxRetries = this.props.maxRetries ?? 3;
    if (this.state.retryCount < maxRetries) {
      this.scheduleRetry();
    }
  }

  private scheduleRetry() {
    const baseDelay = this.props.retryDelay ?? 1000;
    const exponentialDelay = baseDelay * Math.pow(2, this.state.retryCount);
    
    this.setState({ isRetrying: true });
    
    this.retryTimeout = setTimeout(() => {
      this.handleRetry();
    }, exponentialDelay);
  }

  handleRetry = () => {
    const maxRetries = this.props.maxRetries ?? 3;
    
    if (this.state.retryCount >= maxRetries) {
      this.setState({ isRetrying: false });
      return;
    }

    this.props.onRetry?.(this.state.retryCount + 1);
    
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
      isRetrying: false,
      showDetails: false,
    }));
  };

  handleManualRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      isRetrying: false,
    });
    this.props.onRetry?.(this.state.retryCount + 1);
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const maxRetries = this.props.maxRetries ?? 3;
      const canRetry = this.state.retryCount < maxRetries;
      const errorTime = this.state.lastErrorTime
        ? new Date(this.state.lastErrorTime).toLocaleTimeString("fa-IR")
        : null;

      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-6 text-destructive" />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">
              خطا در بارگذاری {this.props.tabName || "محتوا"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-md">
              {this.state.error?.message || "خطای ناشناخته رخ داد"}
            </p>
          </div>

          {/* Retry status */}
          {this.state.isRetrying && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="size-3 animate-spin" />
              <span>در حال تلاش مجدد...</span>
            </div>
          )}

          {/* Retry info */}
          {(this.state.retryCount > 0 || errorTime) && (
            <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] text-muted-foreground">
              {this.state.retryCount > 0 && (
                <span>تلاش {this.state.retryCount} از {maxRetries}</span>
              )}
              {errorTime && (
                <div className="flex items-center gap-1">
                  <Clock className="size-3" />
                  <span>{errorTime}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {canRetry && !this.state.isRetrying && (
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleManualRetry}
                className="gap-1.5"
              >
                <RefreshCw className="size-3.5" />
                تلاش مجدد
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={this.toggleDetails}
              className="gap-1.5 text-xs"
            >
              <ChevronDown
                className={`size-3.5 transition-transform ${
                  this.state.showDetails ? "rotate-180" : ""
                }`}
              />
              جزئیات
            </Button>
          </div>

          {/* Error details */}
          {this.state.showDetails && (
            <div className="w-full max-w-lg rounded-lg border border-border/30 bg-muted/30 p-3 text-left">
              <pre className="overflow-auto max-h-40 text-[10px] font-mono text-muted-foreground whitespace-pre-wrap">
                {this.state.error?.stack || "Stack trace unavailable"}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher Order Component for wrapping components with AsyncErrorBoundary
 */
export function withAsyncErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: { tabName?: string; maxRetries?: number } = {}
) {
  return function WithAsyncErrorBoundary(props: P) {
    return (
      <AsyncErrorBoundary {...options}>
        <WrappedComponent {...props} />
      </AsyncErrorBoundary>
    );
  };
}
