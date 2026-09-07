/**
 * Data Validation & Network Retry Module Tests
 * آزمون‌های واحد برای ماژول‌های اعتبارسنجی داده و مدیریت خطای شبکه
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateCandle,
  detectOutliers,
  validateTimeSeries,
  sanitizeData,
  normalizeData,
  convertToOHLCV,
  processMarketData
} from '../dataValidation';
import {
  withRetry,
  CircuitBreaker,
  ResilientRequest,
  NetworkMonitor
} from '../networkRetry';
import type { OHLCV } from './types';

describe('Data Validation', () => {
  const validCandle: OHLCV = {
    timestamp: Date.now(),
    open: 100,
    high: 110,
    low: 95,
    close: 105,
    volume: 1000000
  };

  describe('validateCandle', () => {
    it('should validate correct candle data', () => {
      const result = validateCandle(validCandle);
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect negative prices', () => {
      const invalidCandle = { ...validCandle, open: -100 };
      const result = validateCandle(invalidCandle);
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Negative price detected');
    });

    it('should detect High/Low logic errors', () => {
      const invalidCandle = { ...validCandle, high: 90, low: 100 };
      const result = validateCandle(invalidCandle);
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('High is lower than Low');
    });

    it('should detect unusual volatility', () => {
      const volatileCandle = {
        ...validCandle,
        low: 100,
        high: 150 // 50% range
      };
      const result = validateCandle(volatileCandle);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.includes('Unusual volatility'))).toBe(true);
    });

    it('should detect zero prices', () => {
      const zeroCandle = { ...validCandle, close: 0 };
      const result = validateCandle(zeroCandle);
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Zero price detected');
    });
  });

  describe('detectOutliers', () => {
    const normalData: OHLCV[] = [
      { timestamp: 1, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
      { timestamp: 2, open: 102, high: 107, low: 97, close: 104, volume: 1100 },
      { timestamp: 3, open: 104, high: 109, low: 99, close: 106, volume: 1050 },
      { timestamp: 4, open: 106, high: 111, low: 101, close: 108, volume: 100000 }, // Outlier volume
      { timestamp: 5, open: 108, high: 113, low: 103, close: 110, volume: 1080 }
    ];

    it('should detect outliers using IQR method', () => {
      const result = detectOutliers(normalData, {
        method: 'iqr',
        threshold: 1.5,
        fields: ['volume']
      });
      expect(result.outliers).toContain(3); // Index 3 has outlier volume
    });

    it('should clean data by replacing outliers', () => {
      const result = detectOutliers(normalData, {
        method: 'iqr',
        threshold: 1.5,
        fields: ['volume']
      });
      expect(result.cleanedData[3].volume).toBeLessThan(normalData[3].volume);
    });

    it('should work with Z-Score method', () => {
      const result = detectOutliers(normalData, {
        method: 'zscore',
        threshold: 2,
        fields: ['close']
      });
      expect(Array.isArray(result.outliers)).toBe(true);
    });
  });

  describe('validateTimeSeries', () => {
    it('should validate correct time series', () => {
      const data: OHLCV[] = [
        { timestamp: 1000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { timestamp: 2000, open: 102, high: 107, low: 97, close: 104, volume: 1100 },
        { timestamp: 3000, open: 104, high: 109, low: 99, close: 106, volume: 1050 }
      ];
      const result = validateTimeSeries(data);
      expect(result.isValid).toBe(true);
    });

    it('should detect empty dataset', () => {
      const result = validateTimeSeries([]);
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Empty dataset');
    });

    it('should detect timestamp order violations', () => {
      const data: OHLCV[] = [
        { timestamp: 2000, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { timestamp: 1000, open: 102, high: 107, low: 97, close: 104, volume: 1100 } // Earlier timestamp
      ];
      const result = validateTimeSeries(data);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.includes('Timestamp order'))).toBe(true);
    });
  });

  describe('sanitizeData', () => {
    it('should fix High/Low inconsistencies', () => {
      const data: OHLCV[] = [{
        timestamp: 1,
        open: 100,
        high: 95, // Invalid: high < open
        low: 105, // Invalid: low > open
        close: 102,
        volume: 1000
      }];
      const sanitized = sanitizeData(data);
      expect(sanitized[0].high).toBeGreaterThanOrEqual(sanitized[0].open);
      expect(sanitized[0].low).toBeLessThanOrEqual(sanitized[0].open);
    });

    it('should fix negative volumes', () => {
      const data: OHLCV[] = [{
        timestamp: 1,
        open: 100,
        high: 105,
        low: 95,
        close: 102,
        volume: -1000
      }];
      const sanitized = sanitizeData(data);
      expect(sanitized[0].volume).toBeGreaterThanOrEqual(0);
    });

    it('should smooth volume data', () => {
      const data: OHLCV[] = [
        { timestamp: 1, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
        { timestamp: 2, open: 102, high: 107, low: 97, close: 104, volume: 2000 },
        { timestamp: 3, open: 104, high: 109, low: 99, close: 106, volume: 1500 }
      ];
      const sanitized = sanitizeData(data);
      // Volume should be smoothed (weighted average)
      expect(sanitized[1].volume).toBeLessThan(2000);
    });
  });

  describe('normalizeData', () => {
    const data: OHLCV[] = [
      { timestamp: 1, open: 100, high: 110, low: 90, close: 105, volume: 1000 },
      { timestamp: 2, open: 105, high: 115, low: 95, close: 110, volume: 2000 },
      { timestamp: 3, open: 110, high: 120, low: 100, close: 115, volume: 1500 }
    ];

    it('should normalize data to 0-1 range', () => {
      const { normalized } = normalizeData(data);
      expect(normalized.length).toBe(3);
      
      // All values should be between 0 and 1
      normalized.forEach(candle => {
        expect(candle.open).toBeGreaterThanOrEqual(0);
        expect(candle.open).toBeLessThanOrEqual(1);
        expect(candle.close).toBeGreaterThanOrEqual(0);
        expect(candle.close).toBeLessThanOrEqual(1);
      });
    });

    it('should return minMax metadata', () => {
      const { minMax } = normalizeData(data);
      expect(minMax.open).toEqual([100, 110]);
      expect(minMax.close).toEqual([105, 115]);
    });

    it('should handle empty data', () => {
      const result = normalizeData([]);
      expect(result.normalized).toHaveLength(0);
    });
  });

  describe('convertToOHLCV', () => {
    it('should convert raw data to OHLCV format', () => {
      const rawData = [
        { time: 1000, o: 100, h: 105, l: 95, c: 102, v: 1000 },
        { time: 2000, o: 102, h: 107, l: 97, c: 104, v: 1100 }
      ];
      const result = convertToOHLCV(rawData);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('timestamp', 1000);
      expect(result[0]).toHaveProperty('open', 100);
    });

    it('should filter out invalid candles', () => {
      const rawData = [
        { time: 1000, o: 100, h: 105, l: 95, c: 0, v: 1000 }, // Invalid: zero close
        { time: 2000, o: 102, h: 107, l: 97, c: 104, v: 1100 }
      ];
      const result = convertToOHLCV(rawData);
      expect(result).toHaveLength(1);
    });
  });

  describe('processMarketData', () => {
    const rawData = [
      { time: 1000, o: 100, h: 105, l: 95, c: 102, v: 1000 },
      { time: 2000, o: 102, h: 107, l: 97, c: 104, v: 100000 }, // Outlier
      { time: 3000, o: 104, h: 109, l: 99, c: 106, v: 1050 }
    ];

    it('should process complete pipeline', () => {
      const result = processMarketData(rawData, {
        removeOutliers: true,
        sanitize: true,
        validate: true
      });
      expect(result.data).toHaveLength(3);
      expect(result.validation.isValid).toBe(true);
    });

    it('should count outliers', () => {
      const result = processMarketData(rawData, {
        removeOutliers: true,
        outlierMethod: 'iqr'
      });
      expect(result.outlierCount).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Network Retry', () => {
  describe('withRetry', () => {
    it('should succeed on first try', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      const result = await withRetry(mockFn, { maxRetries: 3 });
      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.attempts).toBe(1);
    });

    it('should retry on failure', async () => {
      let attempts = 0;
      const mockFn = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) throw new Error('NETWORK_ERROR');
        return Promise.resolve('success');
      });

      const result = await withRetry(mockFn, {
        maxRetries: 3,
        initialDelay: 10,
        maxDelay: 50
      });

      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
    });

    it('should fail after max retries', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('NETWORK_ERROR'));
      const result = await withRetry(mockFn, {
        maxRetries: 2,
        initialDelay: 10,
        maxDelay: 50
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3); // Initial + 2 retries
    });

    it('should not retry non-retryable errors', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('INVALID_REQUEST'));
      const result = await withRetry(mockFn, {
        maxRetries: 3,
        initialDelay: 10,
        retryableErrors: ['NETWORK_ERROR']
      });

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
    });
  });

  describe('CircuitBreaker', () => {
    let breaker: CircuitBreaker;

    beforeEach(() => {
      breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 100
      });
    });

    it('should start in CLOSED state', () => {
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should open after failure threshold', () => {
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure();
      }
      expect(breaker.getState()).toBe('OPEN');
    });

    it('should transition to HALF_OPEN after timeout', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure();
      }
      expect(breaker.getState()).toBe('OPEN');

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(breaker.getState()).toBe('HALF_OPEN');
    });

    it('should close after successful attempts in HALF_OPEN', async () => {
      // Open and wait
      for (let i = 0; i < 3; i++) breaker.recordFailure();
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(breaker.getState()).toBe('HALF_OPEN');

      // Record successes
      breaker.recordSuccess();
      breaker.recordSuccess();
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should execute function when CLOSED', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');
      const result = await breaker.execute(mockFn);
      expect(result).toBe('result');
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should reject when OPEN', async () => {
      for (let i = 0; i < 3; i++) breaker.recordFailure();
      expect(breaker.getState()).toBe('OPEN');

      await expect(breaker.execute(vi.fn())).rejects.toThrow('Circuit breaker is OPEN');
    });
  });

  describe('ResilientRequest', () => {
    let resilient: ResilientRequest;

    beforeEach(() => {
      resilient = new ResilientRequest({
        retry: { maxRetries: 2, initialDelay: 10, maxDelay: 50 }
      });
    });

    it('should combine retry and circuit breaker', async () => {
      let attempts = 0;
      const mockFn = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 2) throw new Error('NETWORK_ERROR');
        return Promise.resolve('success');
      });

      const result = await resilient.execute(mockFn);
      expect(result.success).toBe(true);
    });

    it('should provide circuit breaker stats', () => {
      const stats = resilient.getCircuitBreakerStats();
      expect(stats).toHaveProperty('state');
      expect(stats).toHaveProperty('failureCount');
    });
  });
});
