/**
 * Network Error Handling & Retry Module
 * مدیریت خطای شبکه و مکانیزم Retry خودکار برای قطعی‌های اینترنت
 */

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  retryableStatusCodes?: number[];
  retryableErrors?: string[];
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableErrors: [
    'NETWORK_ERROR',
    'TIMEOUT',
    'CONNECTION_LOST',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'Failed to fetch',
    'NetworkError',
    'AbortError'
  ]
};

/**
 * محاسبه تاخیر با الگوریتم Exponential Backoff + Jitter
 */
function calculateDelay(
  attempt: number,
  config: RetryConfig
): number {
  const exponentialDelay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  const jitter = Math.random() * 0.3 * exponentialDelay; // ±15% jitter
  const delayWithJitter = exponentialDelay + jitter;
  
  return Math.min(delayWithJitter, config.maxDelay);
}

/**
 * بررسی اینکه آیا خطا قابل Retry است یا خیر
 */
function isRetryableError(error: any, config: RetryConfig): boolean {
  // بررسی HTTP status codes
  if (error.response?.status && config.retryableStatusCodes?.includes(error.response.status)) {
    return true;
  }

  // بررسی نوع خطا
  const errorMessage = error.message || error.code || String(error);
  
  for (const retryableError of config.retryableErrors || []) {
    if (errorMessage.includes(retryableError)) {
      return true;
    }
  }

  // بررسی خطاهای شبکه
  if (!navigator.onLine) {
    return true;
  }

  // TypeError معمولاً نشان‌دهنده Network Error است
  if (error instanceof TypeError && errorMessage.includes('fetch')) {
    return true;
  }

  return false;
}

/**
 * اجرای یک تابع با مکانیزم Retry خودکار
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const finalConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  
  let lastError: Error | undefined;
  let totalDelay = 0;
  let attempts = 0;

  for (let attempt = 1; attempt <= finalConfig.maxRetries + 1; attempt++) {
    attempts = attempt;
    
    try {
      const result = await fn();
      return {
        success: true,
        data: result,
        attempts,
        totalDelay
      };
    } catch (error: any) {
      lastError = error;
      
      // اگر آخرین تلاش است، خطا را برگردان
      if (attempt > finalConfig.maxRetries) {
        break;
      }

      // بررسی Retryable بودن خطا
      if (!isRetryableError(error, finalConfig)) {
        console.warn(`[Retry] Non-retryable error: ${error.message}`);
        break;
      }

      // محاسبه تاخیر
      const delay = calculateDelay(attempt, finalConfig);
      totalDelay += delay;

      console.warn(
        `[Retry] Attempt ${attempt}/${finalConfig.maxRetries + 1} failed. ` +
        `Retrying in ${Math.round(delay / 1000)}s... ` +
        `Error: ${error.message}`
      );

      // انتظار قبل از تلاش بعدی
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    error: lastError || new Error('Unknown error'),
    attempts,
    totalDelay
  };
}

/**
 * Circuit Breaker Pattern برای جلوگیری از درخواست‌های مکرر به سرور خراب
 */
export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeout: number; // milliseconds
  private readonly monitoringPeriod: number; // milliseconds

  constructor(options: {
    failureThreshold?: number;
    successThreshold?: number;
    timeout?: number;
    monitoringPeriod?: number;
  } = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 3;
    this.timeout = options.timeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 30000; // 30 seconds
  }

  /**
   * بررسی وضعیت Circuit Breaker
   */
  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    const now = Date.now();
    
    if (this.state === 'OPEN') {
      // بررسی زمان timeout
      if (this.lastFailureTime && now - this.lastFailureTime > this.timeout) {
        console.log('[CircuitBreaker] Transitioning from OPEN to HALF_OPEN');
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      }
    }
    
    return this.state;
  }

  /**
   * ثبت موفقیت
   */
  recordSuccess(): void {
    this.successCount++;
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN' && this.successCount >= this.successThreshold) {
      console.log('[CircuitBreaker] Transitioning from HALF_OPEN to CLOSED');
      this.state = 'CLOSED';
      this.successCount = 0;
    }
  }

  /**
   * ثبت شکست
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      console.log('[CircuitBreaker] Transitioning from HALF_OPEN to OPEN');
      this.state = 'OPEN';
    } else if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
      console.log('[CircuitBreaker] Transitioning from CLOSED to OPEN');
      this.state = 'OPEN';
    }
  }

  /**
   * بررسی امکان اجرا
   */
  canExecute(): boolean {
    const state = this.getState();
    return state !== 'OPEN';
  }

  /**
   * اجرای تابع با Circuit Breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      throw new Error('Circuit breaker is OPEN. Request rejected.');
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * ریست کردن Circuit Breaker
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
  }

  /**
   * دریافت آمار Circuit Breaker
   */
  getStats(): {
    state: string;
    failureCount: number;
    successCount: number;
    lastFailureTime: string | null;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime 
        ? new Date(this.lastFailureTime).toISOString() 
        : null
    };
  }
}

/**
 * ترکیب Retry + Circuit Breaker برای مقاومت حداکثری
 */
export class ResilientRequest {
  private circuitBreaker: CircuitBreaker;
  private retryConfig: RetryConfig;

  constructor(options?: {
    circuitBreaker?: ConstructorParameters<typeof CircuitBreaker>[0];
    retry?: Partial<RetryConfig>;
  }) {
    this.circuitBreaker = new CircuitBreaker(options?.circuitBreaker);
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...options?.retry };
  }

  /**
   * اجرای درخواست با Retry و Circuit Breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<RetryResult<T>> {
    // بررسی Circuit Breaker قبل از اجرا
    if (!this.circuitBreaker.canExecute()) {
      return {
        success: false,
        error: new Error('Circuit breaker is OPEN'),
        attempts: 0,
        totalDelay: 0
      };
    }

    try {
      const result = await withRetry(
        async () => {
          return await this.circuitBreaker.execute(fn);
        },
        this.retryConfig
      );

      if (result.success) {
        this.circuitBreaker.recordSuccess();
      } else {
        this.circuitBreaker.recordFailure();
      }

      return result;
    } catch (error: any) {
      this.circuitBreaker.recordFailure();
      return {
        success: false,
        error,
        attempts: 1,
        totalDelay: 0
      };
    }
  }

  /**
   * دریافت وضعیت Circuit Breaker
   */
  getCircuitBreakerStats() {
    return this.circuitBreaker.getStats();
  }

  /**
   * ریست کردن Circuit Breaker
   */
  resetCircuitBreaker() {
    this.circuitBreaker.reset();
  }
}

/**
 * مانیتورینگ وضعیت آنلاین/آفلاین بودن
 */
export class NetworkMonitor {
  private isOnline: boolean = true;
  private listeners: Set<(online: boolean) => void> = new Set();
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;

  constructor() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  private handleOnline(): void {
    console.log('[NetworkMonitor] Connection restored');
    this.isOnline = true;
    this.reconnectAttempts = 0;
    this.notifyListeners();
  }

  private handleOffline(): void {
    console.warn('[NetworkMonitor] Connection lost');
    this.isOnline = false;
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.isOnline));
  }

  /**
   * اشتراک در تغییرات وضعیت شبکه
   */
  subscribe(callback: (online: boolean) => void): () => void {
    this.listeners.add(callback);
    callback(this.isOnline); // ارسال وضعیت فعلی
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * بررسی وضعیت آنلاین بودن
   */
  checkOnline(): boolean {
    return this.isOnline;
  }

  /**
   * تلاش برای اتصال مجدد با بررسی وضعیت
   */
  async waitForReconnection(timeout: number = 30000): Promise<boolean> {
    if (this.isOnline) return true;

    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkConnection = () => {
        if (this.isOnline) {
          resolve(true);
          return;
        }

        if (Date.now() - startTime > timeout) {
          resolve(false);
          return;
        }

        setTimeout(checkConnection, 1000);
      };

      checkConnection();
    });
  }

  /**
   * دریافت آمار شبکه
   */
  getStats(): {
    isOnline: boolean;
    reconnectAttempts: number;
  } {
    return {
      isOnline: this.isOnline,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// ایجاد نمونه‌های سینگلتون
export const networkMonitor = new NetworkMonitor();
export const defaultResilientRequest = new ResilientRequest();
