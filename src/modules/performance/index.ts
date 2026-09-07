/**
 * Performance Optimization Module - ماژول بهینه‌سازی عملکرد
 * 
 * This module provides performance monitoring and optimization features:
 * - Bundle size analysis
 * - Load time tracking
 * - Memory usage monitoring
 * - Lazy loading utilities
 * - Cache management
 * 
 * Architecture:
 * - Lightweight with zero dependencies
 * - Works in browser environment
 * - Provides actionable insights
 * - Ready for integration with analytics services
 */

export interface PerformanceMetrics {
  /** First Contentful Paint (ms) */
  fcp: number;
  /** Largest Contentful Paint (ms) */
  lcp: number;
  /** First Input Delay (ms) */
  fid: number;
  /** Cumulative Layout Shift */
  cls: number;
  /** Time to Interactive (ms) */
  tti: number;
  /** Total Blocking Time (ms) */
  tbt: number;
  /** DOM Content Loaded (ms) */
  dcl: number;
  /** Full Page Load (ms) */
  load: number;
  /** Memory Usage (MB) */
  memory?: number;
  /** Number of HTTP requests */
  requests: number;
  /** Total transferred size (KB) */
  transferredSize: number;
  /** Total resource size (KB) */
  resourceSize: number;
}

export interface OptimizationSuggestion {
  id: string;
  category: "bundle" | "network" | "rendering" | "memory" | "caching";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  estimatedImprovement: string;
  action?: () => void;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number; // bytes
  oldestEntry: Date | null;
  newestEntry: Date | null;
  hitRate: number; // percentage
}

export const DEFAULT_THRESHOLDS = {
  fcp: 1800, // ms
  lcp: 2500, // ms
  fid: 100, // ms
  cls: 0.1,
  tti: 3800, // ms
  tbt: 300, // ms
};

/**
 * Measure Core Web Vitals
 */
export async function measureCoreWebVitals(): Promise<Partial<PerformanceMetrics>> {
  return new Promise((resolve) => {
    const metrics: Partial<PerformanceMetrics> = {};

    // Check if PerformanceObserver is available
    if (typeof PerformanceObserver === "undefined") {
      resolve(metrics);
      return;
    }

    let pendingEntries: PerformanceEntry[] = [];

    const observer = new PerformanceObserver((entryList) => {
      pendingEntries = entryList.getEntries();
    });

    // Observe different metric types
    try {
      observer.observe({ type: "paint", buffered: true });
      observer.observe({ type: "largest-contentful-paint", buffered: true });
      observer.observe({ type: "layout-shift", buffered: true });
      observer.observe({ type: "first-input", buffered: true });
    } catch (e) {
      console.warn("PerformanceObserver not fully supported");
    }

    // Collect metrics after a short delay
    setTimeout(() => {
      observer.disconnect();

      pendingEntries.forEach((entry) => {
        switch (entry.entryType) {
          case "first-contentful-paint":
            metrics.fcp = entry.startTime;
            break;
          case "largest-contentful-paint":
            metrics.lcp = entry.startTime;
            break;
          case "layout-shift":
            metrics.cls = (metrics.cls || 0) + (entry as any).value;
            break;
          case "first-input":
            metrics.fid = entry.duration;
            break;
        }
      });

      resolve(metrics);
    }, 1000);
  });
}

/**
 * Get navigation timing metrics
 */
export function getNavigationTiming(): Partial<PerformanceMetrics> {
  const metrics: Partial<PerformanceMetrics> = {};

  if (typeof performance === "undefined" || !performance.timing) {
    return metrics;
  }

  const timing = performance.timing;
  
  // Calculate various timing metrics
  metrics.dcl = timing.domContentLoadedEventEnd - timing.navigationStart;
  metrics.load = timing.loadEventEnd - timing.navigationStart;
  metrics.fcp = timing.domContentLoadedEventEnd - timing.navigationStart;

  return metrics;
}

/**
 * Analyze resource loading
 */
export function analyzeResources(): { 
  requests: number; 
  transferredSize: number; 
  resourceSize: number;
  byType: Record<string, { count: number; size: number }>;
} {
  if (typeof performance === "undefined" || !performance.getEntriesByType) {
    return { requests: 0, transferredSize: 0, resourceSize: 0, byType: {} };
  }

  const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  const byType: Record<string, { count: number; size: number }> = {};

  let transferredSize = 0;
  let resourceSize = 0;

  resources.forEach((resource) => {
    const type = resource.initiatorType || "other";
    
    if (!byType[type]) {
      byType[type] = { count: 0, size: 0 };
    }
    
    byType[type].count++;
    byType[type].size += resource.transferSize || 0;
    
    transferredSize += resource.transferSize || 0;
    resourceSize += resource.encodedBodySize || 0;
  });

  return {
    requests: resources.length,
    transferredSize: Math.round(transferredSize / 1024), // KB
    resourceSize: Math.round(resourceSize / 1024), // KB
    byType,
  };
}

/**
 * Get memory usage (Chrome only)
 */
export function getMemoryUsage(): number | undefined {
  if (typeof performance === "undefined" || !(performance as any).memory) {
    return undefined;
  }

  const memory = (performance as any).memory;
  return Math.round(memory.usedJSHeapSize / (1024 * 1024)); // MB
}

/**
 * Get comprehensive performance metrics
 */
export async function getPerformanceMetrics(): Promise<PerformanceMetrics> {
  const webVitals = await measureCoreWebVitals();
  const navTiming = getNavigationTiming();
  const resources = analyzeResources();
  const memory = getMemoryUsage();

  return {
    fcp: webVitals.fcp || navTiming.fcp || 0,
    lcp: webVitals.lcp || 0,
    fid: webVitals.fid || 0,
    cls: webVitals.cls || 0,
    tti: 0, // Requires more complex calculation
    tbt: 0, // Requires more complex calculation
    dcl: navTiming.dcl || 0,
    load: navTiming.load || 0,
    memory,
    requests: resources.requests,
    transferredSize: resources.transferredSize,
    resourceSize: resources.resourceSize,
  };
}

/**
 * Generate optimization suggestions based on metrics
 */
export function generateOptimizationSuggestions(
  metrics: PerformanceMetrics
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];

  // Check FCP
  if (metrics.fcp > DEFAULT_THRESHOLDS.fcp) {
    suggestions.push({
      id: "fcp-slow",
      category: "rendering",
      priority: "high",
      title: "بهبود First Contentful Paint",
      description: `FCP فعلی: ${Math.round(metrics.fcp)}ms (هدف: ${DEFAULT_THRESHOLDS.fcp}ms)\n\nراهکارها:\n• کاهش حجم CSS بحرانی\n• بهینه‌سازی فونت‌ها\n• حذف رندر بلاکینگ`,
      estimatedImprovement: `${Math.round((metrics.fcp - DEFAULT_THRESHOLDS.fcp) / 1000 * 100)}٪`,
    });
  }

  // Check LCP
  if (metrics.lcp > DEFAULT_THRESHOLDS.lcp) {
    suggestions.push({
      id: "lcp-slow",
      category: "rendering",
      priority: "high",
      title: "بهبود Largest Contentful Paint",
      description: `LCP فعلی: ${Math.round(metrics.lcp)}ms (هدف: ${DEFAULT_THRESHOLDS.lcp}ms)\n\nراهکارها:\n• بهینه‌سازی تصاویر بزرگ\n• استفاده از lazy loading\n• بهبود سرعت سرور`,
      estimatedImprovement: `${Math.round((metrics.lcp - DEFAULT_THRESHOLDS.lcp) / 1000 * 100)}٪`,
    });
  }

  // Check bundle size
  if (metrics.resourceSize > 2000) {
    suggestions.push({
      id: "large-bundle",
      category: "bundle",
      priority: "high",
      title: "کاهش حجم باندل",
      description: `حجم کل: ${metrics.resourceSize}KB\n\nراهکارها:\n• استفاده از code splitting\n• حذف وابستگی‌های غیرضروری\n• فشرده‌سازی بهتر`,
      estimatedImprovement: "۳۰-۵۰٪",
    });
  }

  // Check number of requests
  if (metrics.requests > 50) {
    suggestions.push({
      id: "many-requests",
      category: "network",
      priority: "medium",
      title: "کاهش تعداد درخواست‌ها",
      description: `تعداد درخواست‌ها: ${metrics.requests}\n\nراهکارها:\n• ترکیب فایل‌های کوچک\n• استفاده از sprite برای آیکون‌ها\n• کش کردن بهتر`,
      estimatedImprovement: "۲۰-۴۰٪",
    });
  }

  // Check CLS
  if (metrics.cls > DEFAULT_THRESHOLDS.cls) {
    suggestions.push({
      id: "high-cls",
      category: "rendering",
      priority: "medium",
      title: "کاهش Layout Shift",
      description: `CLS فعلی: ${metrics.cls.toFixed(3)} (هدف: ${DEFAULT_THRESHOLDS.cls})\n\nراهکارها:\n• تعیین ابعاد تصاویر\n• رزرو فضای المان‌ها\n• جلوگیری از تزریق ناگهانی محتوا`,
      estimatedImprovement: `${Math.round((metrics.cls - DEFAULT_THRESHOLDS.cls) * 100)}٪`,
    });
  }

  // Memory check
  if (metrics.memory && metrics.memory > 100) {
    suggestions.push({
      id: "high-memory",
      category: "memory",
      priority: "medium",
      title: "مدیریت حافظه",
      description: `حافظه مصرفی: ${metrics.memory}MB\n\nراهکارها:\n• پاک کردن listenerها\n• آزاد کردن referenceها\n• استفاده از WeakMap`,
      estimatedImprovement: "۲۰-۳۰٪",
    });
  }

  // If no issues found
  if (suggestions.length === 0) {
    suggestions.push({
      id: "all-good",
      category: "caching",
      priority: "low",
      title: "عملکرد عالی!",
      description: "همه معیارهای عملکرد در محدوده مطلوب هستند.\n\nپیشنهاد: حفظ وضعیت فعلی و مانیتورینگ مداوم.",
      estimatedImprovement: "N/A",
    });
  }

  return suggestions;
}

/**
 * Cache management utilities
 */
export class CacheManager {
  private cacheName: string;
  private stats: CacheStats = {
    totalEntries: 0,
    totalSize: 0,
    oldestEntry: null,
    newestEntry: null,
    hitRate: 0,
  };
  private hits = 0;
  private misses = 0;

  constructor(cacheName: string = "performance-cache") {
    this.cacheName = cacheName;
  }

  async init(): Promise<void> {
    if (typeof caches !== "undefined") {
      await caches.open(this.cacheName);
    }
  }

  async get(key: string): Promise<any> {
    if (typeof caches === "undefined") {
      return null;
    }

    const cache = await caches.open(this.cacheName);
    const response = await cache.match(key);
    
    if (response) {
      this.hits++;
      return response.json();
    } else {
      this.misses++;
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (typeof caches === "undefined") {
      return;
    }

    const cache = await caches.open(this.cacheName);
    const response = new Response(JSON.stringify(value), {
      headers: {
        "Content-Type": "application/json",
        "X-TTL": ttl?.toString() || "3600",
      },
    });

    await cache.put(key, response);
    this.updateStats();
  }

  async delete(key: string): Promise<boolean> {
    if (typeof caches === "undefined") {
      return false;
    }

    const cache = await caches.open(this.cacheName);
    return cache.delete(key);
  }

  async clear(): Promise<void> {
    if (typeof caches === "undefined") {
      return;
    }

    await caches.delete(this.cacheName);
    this.stats = {
      totalEntries: 0,
      totalSize: 0,
      oldestEntry: null,
      newestEntry: null,
      hitRate: 0,
    };
  }

  private async updateStats(): Promise<void> {
    if (typeof caches === "undefined") {
      return;
    }

    try {
      const cache = await caches.open(this.cacheName);
      const keys = await cache.keys();
      
      this.stats.totalEntries = keys.length;
      this.stats.hitRate = this.hits + this.misses > 0 
        ? Math.round((this.hits / (this.hits + this.misses)) * 100)
        : 0;
    } catch (e) {
      console.warn("Failed to update cache stats", e);
    }
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }
}

/**
 * Lazy loading utility for components
 */
export function createLazyLoader<T>() {
  const loadedModules = new Map<string, T>();

  return {
    async load(moduleId: string, loader: () => Promise<T>): Promise<T> {
      if (loadedModules.has(moduleId)) {
        return loadedModules.get(moduleId)!;
      }

      const start = performance.now();
      const module = await loader();
      const duration = performance.now() - start;

      console.log(`[LazyLoader] ${moduleId} loaded in ${Math.round(duration)}ms`);
      
      loadedModules.set(moduleId, module);
      return module;
    },

    preload(moduleId: string, loader: () => Promise<T>): void {
      // Start loading without waiting
      loader().then((module) => {
        loadedModules.set(moduleId, module);
      });
    },

    isLoaded(moduleId: string): boolean {
      return loadedModules.has(moduleId);
    },

    clear(moduleId?: string): void {
      if (moduleId) {
        loadedModules.delete(moduleId);
      } else {
        loadedModules.clear();
      }
    },
  };
}

/**
 * Performance monitoring class
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly maxHistory = 100;

  async measure(): Promise<PerformanceMetrics> {
    const metrics = await getPerformanceMetrics();
    
    this.metrics.push(metrics);
    if (this.metrics.length > this.maxHistory) {
      this.metrics.shift();
    }

    return metrics;
  }

  startMonitoring(intervalMs: number = 30000): void {
    this.stopMonitoring();
    
    this.intervalId = setInterval(() => {
      this.measure().catch(console.error);
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getAverageMetrics(): Partial<PerformanceMetrics> {
    if (this.metrics.length === 0) {
      return {};
    }

    const sum = this.metrics.reduce(
      (acc, m) => ({
        fcp: acc.fcp! + m.fcp,
        lcp: acc.lcp! + m.lcp,
        load: acc.load! + m.load,
        requests: acc.requests! + m.requests,
      }),
      { fcp: 0, lcp: 0, load: 0, requests: 0 }
    );

    const count = this.metrics.length;
    return {
      fcp: Math.round(sum.fcp! / count),
      lcp: Math.round(sum.lcp! / count),
      load: Math.round(sum.load! / count),
      requests: Math.round(sum.requests! / count),
    };
  }

  getSuggestions(): OptimizationSuggestion[] {
    const latest = this.metrics[this.metrics.length - 1];
    if (!latest) {
      return [];
    }

    return generateOptimizationSuggestions(latest);
  }

  exportReport(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      averageMetrics: this.getAverageMetrics(),
      suggestions: this.getSuggestions(),
      history: this.metrics.slice(-10),
    }, null, 2);
  }
}

// Export singleton instance
let _monitor: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!_monitor) {
    _monitor = new PerformanceMonitor();
  }
  return _monitor;
}
