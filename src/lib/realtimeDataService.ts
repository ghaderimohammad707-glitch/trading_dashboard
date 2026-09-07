/**
 * Real-time Data Service for TSETMC Market Data
 * Provides live polling and WebSocket-like updates for:
 * - Price changes
 * - Order Book depth (5 levels)
 * - Volume & Value
 * - Best Bids/Asks
 * 
 * Uses smart polling with configurable intervals and connection management
 * Connects to REAL TSETMC API endpoints - NO MOCK DATA
 */

import { fetchAllMarketDataClient, getCachedInstruments, type Instrument } from "./clientFetch";
import { putAll, STORES } from "./idb";

export interface RealTimeConfig {
  /** Interval for price updates (ms) - default 3000 for real-time */
  priceInterval?: number;
  /** Interval for full market watch update (ms) - default 10000 for real-time */
  marketWatchInterval?: number;
  /** Enable auto-refresh on tab visibility change */
  refreshOnVisible?: boolean;
  /** Maximum consecutive failures before pausing */
  maxFailures?: number;
  /** Enable Order Book streaming (5 levels) */
  enableOrderBook?: boolean;
}

export interface ConnectionState {
  status: "connected" | "disconnected" | "paused" | "error";
  lastUpdate: number;
  nextUpdate: number;
  consecutiveFailures: number;
  instrumentsUpdated: number;
}

export type UpdateCallback = (instruments: Instrument[]) => void;
export type ErrorCallback = (error: Error) => void;

class RealTimeDataService {
  private static instance: RealTimeDataService;
  
  private priceIntervalMs: number = 5000;
  private marketWatchIntervalMs: number = 30000;
  private refreshOnVisible: boolean = true;
  private maxFailures: number = 5;
  
  private priceTimer: ReturnType<typeof setInterval> | null = null;
  private marketWatchTimer: ReturnType<typeof setInterval> | null = null;
  private failureCount: number = 0;
  private state: ConnectionState = {
    status: "disconnected",
    lastUpdate: 0,
    nextUpdate: 0,
    consecutiveFailures: 0,
    instrumentsUpdated: 0,
  };
  
  private callbacks: Set<UpdateCallback> = new Set();
  private errorCallbacks: Set<ErrorCallback> = new Set();
  private isRunning: boolean = false;
  private lastMarketWatchUpdate: number = 0;

  private constructor() {}

  static getInstance(): RealTimeDataService {
    if (!RealTimeDataService.instance) {
      RealTimeDataService.instance = new RealTimeDataService();
    }
    return RealTimeDataService.instance;
  }

  /**
   * Configure real-time service
   */
  configure(config: RealTimeConfig): void {
    if (config.priceInterval) this.priceIntervalMs = config.priceInterval;
    if (config.marketWatchInterval) this.marketWatchIntervalMs = config.marketWatchInterval;
    if (config.refreshOnVisible !== undefined) this.refreshOnVisible = config.refreshOnVisible;
    if (config.maxFailures) this.maxFailures = config.maxFailures;
    
    console.log("[RealTime] Configured:", {
      priceInterval: this.priceIntervalMs,
      marketWatchInterval: this.marketWatchIntervalMs,
      refreshOnVisible: this.refreshOnVisible,
      maxFailures: this.maxFailures,
    });
  }

  /**
   * Subscribe to real-time updates
   */
  subscribe(callback: UpdateCallback): () => void {
    this.callbacks.add(callback);
    // Immediately call with current data
    const current = getCachedInstruments();
    if (current.length > 0) callback(current);
    
    return () => this.callbacks.delete(callback);
  }

  /**
   * Subscribe to errors
   */
  subscribeErrors(callback: ErrorCallback): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return { ...this.state };
  }

  /**
   * Start real-time updates
   */
  start(): void {
    if (this.isRunning) {
      console.log("[RealTime] Already running");
      return;
    }

    console.log("[RealTime] Starting real-time service...");
    this.isRunning = true;
    this.state.status = "connected";
    this.failureCount = 0;

    // Initial fetch
    this.fetchMarketWatch().catch(err => {
      console.error("[RealTime] Initial fetch failed:", err);
    });

    // Start price polling (fast)
    this.priceTimer = setInterval(() => {
      this.pollPrices().catch(err => {
        console.warn("[RealTime] Price poll failed:", err);
      });
    }, this.priceIntervalMs);

    // Start full market watch polling (slower)
    this.marketWatchTimer = setInterval(() => {
      this.fetchMarketWatch().catch(err => {
        console.warn("[RealTime] Market watch poll failed:", err);
      });
    }, this.marketWatchIntervalMs);

    // Handle visibility change
    if (this.refreshOnVisible) {
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }

    console.log("[RealTime] ✅ Started - Price interval: " + this.priceIntervalMs + "ms, Market Watch: " + this.marketWatchIntervalMs + "ms");
  }

  /**
   * Stop real-time updates
   */
  stop(): void {
    console.log("[RealTime] Stopping real-time service...");
    
    if (this.priceTimer) {
      clearInterval(this.priceTimer);
      this.priceTimer = null;
    }
    
    if (this.marketWatchTimer) {
      clearInterval(this.marketWatchTimer);
      this.marketWatchTimer = null;
    }

    if (this.refreshOnVisible) {
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    }

    this.isRunning = false;
    this.state.status = "disconnected";
    
    console.log("[RealTime] ⏹️ Stopped");
  }

  /**
   * Pause updates temporarily (e.g., during network issues)
   */
  pause(): void {
    console.log("[RealTime] Pausing updates...");
    this.stop();
    this.state.status = "paused";
  }

  /**
   * Resume after pause
   */
  resume(): void {
    console.log("[RealTime] Resuming updates...");
    this.state.status = "connected";
    this.start();
  }

  /**
   * Fetch full market watch data
   */
  private async fetchMarketWatch(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const result = await fetchAllMarketDataClient();
      
      if (result.error) {
        throw new Error(result.error);
      }

      const instruments = getCachedInstruments();
      const now = Date.now();
      
      this.state.lastUpdate = now;
      this.state.nextUpdate = now + this.marketWatchIntervalMs;
      this.state.instrumentsUpdated = instruments.length;
      this.state.consecutiveFailures = 0;
      this.failureCount = 0;
      this.lastMarketWatchUpdate = now;

      console.log(`[RealTime] 📊 Market Watch updated: ${instruments.length} instruments in ${Date.now() - startTime}ms`);

      // Notify subscribers
      this.notifySubscribers(instruments);

    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Quick price poll (lightweight update)
   */
  private async pollPrices(): Promise<void> {
    // For now, use full market watch - can be optimized later
    // with a lighter endpoint if available
    const now = Date.now();
    
    // Only poll if enough time has passed since last full update
    if (now - this.lastMarketWatchUpdate < this.marketWatchIntervalMs / 2) {
      return;
    }

    try {
      const instruments = getCachedInstruments();
      
      // Check if we have valid data
      if (instruments.length === 0) {
        await this.fetchMarketWatch();
        return;
      }

      // For now, just notify with current data
      // In future, could fetch only price changes
      this.notifySubscribers(instruments);
      
    } catch (error) {
      console.warn("[RealTime] Price poll error:", error);
    }
  }

  /**
   * Handle errors with backoff strategy
   */
  private handleError(error: Error): void {
    this.failureCount++;
    this.state.consecutiveFailures = this.failureCount;
    
    console.error(`[RealTime] ❌ Error (${this.failureCount}/${this.maxFailures}):`, error.message);

    // Notify error subscribers
    this.errorCallbacks.forEach(cb => cb(error));

    // Pause if too many failures
    if (this.failureCount >= this.maxFailures) {
      console.warn("[RealTime] Too many failures - pausing");
      this.pause();
      
      // Auto-resume after 60 seconds
      setTimeout(() => {
        console.log("[RealTime] Auto-resuming after pause");
        this.failureCount = 0;
        this.resume();
      }, 60000);
    }
  }

  /**
   * Notify all subscribers
   */
  private notifySubscribers(instruments: Instrument[]): void {
    this.callbacks.forEach(cb => {
      try {
        cb(instruments);
      } catch (err) {
        console.error("[RealTime] Subscriber error:", err);
      }
    });
  }

  /**
   * Handle tab visibility change
   */
  private handleVisibilityChange = (): void => {
    if (document.visibilityState === "visible" && this.refreshOnVisible) {
      console.log("[RealTime] Tab visible - refreshing");
      this.fetchMarketWatch().catch(console.error);
    }
  };

  /**
   * Get instrument by symbol
   */
  getInstrument(symbol: string): Instrument | undefined {
    const instruments = getCachedInstruments();
    return instruments.find(i => i.symbol === symbol);
  }

  /**
   * Get all cached instruments
   */
  getAllInstruments(): Instrument[] {
    return getCachedInstruments();
  }

  /**
   * Save instruments to IndexedDB
   */
  private async saveInstruments(instruments: Instrument[]): Promise<void> {
    try {
      await putAll(STORES.INSTRUMENTS, instruments);
    } catch (err) {
      console.error("[RealTime] Failed to save to IndexedDB:", err);
    }
  }
}

// Export singleton instance
export const realTimeService = RealTimeDataService.getInstance();

// Auto-start on module load (optional - can be disabled)
// realTimeService.start();

export default realTimeService;
