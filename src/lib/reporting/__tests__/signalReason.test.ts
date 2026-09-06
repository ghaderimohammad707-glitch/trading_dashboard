/**
 * تست‌های واحد برای مفسر سیگنال (Signal Reason)
 */

import { describe, it, expect } from 'vitest';
import { interpretSignal, getQuickSignalSummary } from '../signalReason';
import { CompositeSignal } from '../../analysisEngines';

describe('فاز ۴: گزارش‌دهی - Signal Reason Interpreter', () => {
  
  const createTestSignal = (overrides: Partial<CompositeSignal> = {}): CompositeSignal => ({
    symbol: 'خودرو',
    action: 'buy',
    currentPrice: 15000,
    confidence: 75,
    timestamp: new Date(),
    indicators: {
      rsi: 25, // اشباع فروش
      macd: {
        signal: 'bullish_crossover',
        histogram: 150
      },
      volumeRatio: 2.5
    },
    tableauData: {
      smartMoneyFlow: 'inflow',
      suspiciousVolume: true
    },
    ...overrides
  });
  
  describe('interpretSignal', () => {
    it('باید توضیحات کامل سیگنال خرید را تولید کند', () => {
      const signal = createTestSignal();
      const result = interpretSignal(signal);
      
      expect(result.title).toContain('خرید');
      expect(result.description.length).toBeGreaterThan(50);
      expect(result.technicalReasons.length).toBeGreaterThan(0);
      expect(result.confidenceScore).toBe(75);
      expect(result.confidenceLevel).toBe('قوی');
    });
    
    it('باید سطح اطمینان را درست تشخیص دهد', () => {
      const highConfSignal = createTestSignal({ confidence: 90 });
      const medConfSignal = createTestSignal({ confidence: 60 });
      const lowConfSignal = createTestSignal({ confidence: 30 });
      
      expect(interpretSignal(highConfSignal).confidenceLevel).toBe('خیلی قوی');
      expect(interpretSignal(medConfSignal).confidenceLevel).toBe('متوسط');
      expect(interpretSignal(lowConfSignal).confidenceLevel).toBe('ضعیف');
    });
    
    it('باید واگرایی RSI را تشخیص دهد', () => {
      const signal = createTestSignal({
        indicators: {
          ...createTestSignal().indicators,
          rsiDivergence: 'positive'
        }
      });
      
      const result = interpretSignal(signal);
      expect(result.technicalReasons.some(r => r.includes('واگرایی مثبت'))).toBe(true);
    });
    
    it('باید ورود پول هوشمند را تشخیص دهد', () => {
      const signal = createTestSignal({
        tableauData: {
          smartMoneyFlow: 'inflow'
        }
      });
      
      const result = interpretSignal(signal);
      expect(result.tableauReasons.some(r => r.includes('ورود پول هوشمند'))).toBe(true);
    });
    
    it('باید حجم مشکوک را تشخیص دهد', () => {
      const signal = createTestSignal({
        tableauData: {
          suspiciousVolume: true
        }
      });
      
      const result = interpretSignal(signal);
      expect(result.tableauReasons.some(r => r.includes('حجم مشکوک'))).toBe(true);
    });
    
    it('باید سیگنال فروش را تفسیر کند', () => {
      const sellSignal = createTestSignal({
        action: 'sell',
        indicators: {
          rsi: 80, // اشباع خرید
          macd: {
            signal: 'bearish_crossover',
            histogram: -150
          }
        }
      });
      
      const result = interpretSignal(sellSignal);
      expect(result.title).toContain('فروش');
      expect(result.technicalReasons.some(r => r.includes('اشباع خرید'))).toBe(true);
    });
    
    it('باید باندهای بولینگر را تحلیل کند', () => {
      const signal = createTestSignal({
        currentPrice: 9500,
        indicators: {
          ...createTestSignal().indicators,
          bollingerBands: {
            upper: 16000,
            middle: 13000,
            lower: 10000,
            bandwidth: 0.04 // فشرده
          }
        }
      });
      
      const result = interpretSignal(signal);
      expect(result.technicalReasons.some(r => r.includes('کف باند بولینگر') || r.includes('فشرده'))).toBe(true);
    });
  });
  
  describe('getQuickSignalSummary', () => {
    it('باید خلاصه سریع سیگنال را برگرداند', () => {
      const signal = createTestSignal();
      const summary = getQuickSignalSummary(signal);
      
      expect(summary).toContain('🟢');
      expect(summary).toContain('خودرو');
      expect(summary).toContain('اطمینان');
    });
    
    it('باید برای سیگنال فروش ایموجی قرمز داشته باشد', () => {
      const sellSignal = createTestSignal({ action: 'sell' });
      const summary = getQuickSignalSummary(sellSignal);
      
      expect(summary).toContain('🔴');
    });
  });
});
