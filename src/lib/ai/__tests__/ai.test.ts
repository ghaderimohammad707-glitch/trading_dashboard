/**
 * تست‌های واحد برای ماژول‌های هوش مصنوعی فاز ۳
 */

import { describe, it, expect } from '@jest/globals';
import {
  detectMarketRegime,
  filterSignalByRegime,
  calculateBollingerBands,
  calculateATR
} from '../marketRegime';
import {
  calculateRiskReward,
  calculatePositionSize,
  analyzeTradeSetup
} from '../riskReward';
import {
  analyzeSingleNews,
  analyzeNewsSentiment,
  adjustSignalBySentiment,
  generateMockNews
} from '../newsSentiment';
import {
  performMultiLayerAnalysis,
  generateAnalysisReport
} from '../signalAggregator';
import { Candle } from '../../types';

// داده‌های تستی
function generateTestCandles(count: number, trend: 'UP' | 'DOWN' | 'RANGE' = 'RANGE'): Candle[] {
  const candles: Candle[] = [];
  let price = 10000;
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    const change = trend === 'UP' ? Math.random() * 200 - 50 : 
                   trend === 'DOWN' ? Math.random() * 200 - 150 :
                   Math.random() * 300 - 150;
    
    price += change;
    price = Math.max(5000, price); // حداقل قیمت
    
    const open = price;
    const close = price + (Math.random() * 200 - 100);
    const high = Math.max(open, close) + Math.random() * 100;
    const low = Math.min(open, close) - Math.random() * 100;
    
    candles.push({
      timestamp: new Date(now - (count - i) * 86400000),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.floor(Math.random() * 1000000)
    });
  }
  
  return candles;
}

describe('فاز ۳: هوش مصنوعی و تحلیل چندلایه', () => {
  
  describe('Market Regime Detection', () => {
    it('باید رژیم بازار رونددار صعودی را تشخیص دهد', () => {
      const candles = generateTestCandles(50, 'UP');
      const result = detectMarketRegime(candles);
      
      expect(result.regime).toBeOneOf(['STRONG_BULL', 'WEAK_BULL']);
      expect(result.adx).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
    
    it('باید رژیم بازار رونددار نزولی را تشخیص دهد', () => {
      const candles = generateTestCandles(50, 'DOWN');
      const result = detectMarketRegime(candles);
      
      expect(result.regime).toBeOneOf(['STRONG_BEAR', 'WEAK_BEAR']);
    });
    
    it('باید فیلتر سیگنال خرید در بازار رنج را رد کند', () => {
      const candles = generateTestCandles(50, 'RANGE');
      const regime = detectMarketRegime(candles);
      const result = filterSignalByRegime('BUY', regime, 40);
      
      // در بازار رنج، سیگنال خرید باید ضعیف شود
      expect(result.adjustedConfidence).toBeLessThanOrThan(regime.confidence);
    });
    
    it('باید باندهای بولینگر را محاسبه کند', () => {
      const candles = generateTestCandles(30);
      const bands = calculateBollingerBands(candles, 20);
      
      expect(bands.length).toBe(30);
      // آخرین باند باید مقدار معتبر داشته باشد
      expect(isNaN(bands[29].upper)).toBe(false);
      expect(bands[29].upper).toBeGreaterThan(bands[29].middle);
      expect(bands[29].lower).toBeLessThan(bands[29].middle);
    });
    
    it('باید ATR را محاسبه کند', () => {
      const candles = generateTestCandles(30);
      const atr = calculateATR(candles, 14);
      
      expect(atr.length).toBe(30);
      expect(atr[29]).toBeGreaterThan(0);
    });
  });
  
  describe('Risk/Reward Calculator', () => {
    it('باید نقاط ورود، حد ضرر و حد سود را برای سیگنال خرید محاسبه کند', () => {
      const candles = generateTestCandles(30);
      const result = calculateRiskReward(candles, 'BUY');
      
      expect(result.entryPrice).toBeGreaterThan(0);
      expect(result.stopLoss).toBeLessThan(result.entryPrice);
      expect(result.takeProfit1).toBeGreaterThan(result.entryPrice);
      expect(result.takeProfit2).toBeGreaterThan(result.takeProfit1);
      expect(result.riskRewardRatio).toBeGreaterThan(0);
    });
    
    it('باید نقاط ورود، حد ضرر و حد سود را برای سیگنال فروش محاسبه کند', () => {
      const candles = generateTestCandles(30);
      const result = calculateRiskReward(candles, 'SELL');
      
      expect(result.entryPrice).toBeGreaterThan(0);
      expect(result.stopLoss).toBeGreaterThan(result.entryPrice);
      expect(result.takeProfit1).toBeLessThan(result.entryPrice);
      expect(result.takeProfit2).toBeLessThan(result.takeProfit1);
    });
    
    it('باید حجم پوزیشن را بر اساس مدیریت سرمایه محاسبه کند', () => {
      const result = calculatePositionSize({
        totalCapital: 100000000,
        riskPerTrade: 2,
        entryPrice: 10000,
        stopLoss: 9500
      });
      
      expect(result.shares).toBeGreaterThan(0);
      expect(result.positionSize).toBeGreaterThan(0);
      expect(result.riskAmount).toBe(2000000); // 2٪ از 100 میلیون
    });
    
    it('باید تحلیل جامع معامله را انجام دهد', () => {
      const candles = generateTestCandles(30);
      const result = analyzeTradeSetup(candles, 'BUY', 100000000, 2);
      
      expect(result.rrAnalysis.entryPrice).toBeGreaterThan(0);
      expect(result.positionSizing.shares).toBeGreaterThanOrEqual(0);
      expect(result.finalConfidence).toBeGreaterThanOrEqual(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });
  
  describe('News Sentiment Analysis', () => {
    it('باید یک خبر مثبت را تحلیل کند', () => {
      const news = {
        id: 'test-1',
        title: 'رشد اقتصادی کشور ادامه دارد و سود شرکت‌ها افزایش یافت',
        source: 'تست',
        publishedAt: new Date(),
        category: 'ECONOMIC' as const
      };
      
      const result = analyzeSingleNews(news);
      expect(result.sentiment).toBeGreaterThan(0);
      expect(result.keywords.length).toBeGreaterThan(0);
    });
    
    it('باید یک خبر منفی را تحلیل کند', () => {
      const news = {
        id: 'test-2',
        title: 'کاهش شاخص بورس و زیان دهی شرکت‌ها',
        source: 'تست',
        publishedAt: new Date(),
        category: 'ECONOMIC' as const
      };
      
      const result = analyzeSingleNews(news);
      expect(result.sentiment).toBeLessThan(0);
    });
    
    it('باید مجموعه اخبار را تحلیل کند', () => {
      const newsItems = generateMockNews(7);
      const result = analyzeNewsSentiment(newsItems);
      
      expect(result.newsCount).toBeGreaterThan(0);
      expect(result.overallScore).toBeGreaterThanOrEqual(-100);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.breakdown.positive + result.breakdown.neutral + result.breakdown.negative)
        .toBe(result.newsCount);
    });
    
    it('باید سیگنال خرید را با اخبار منفی تعدیل کند', () => {
      const sentimentAnalysis = {
        overallScore: -60,
        category: 'NEGATIVE' as const,
        confidence: 70,
        newsCount: 5,
        breakdown: { positive: 1, neutral: 1, negative: 3 },
        trend: 'DETERIORATING' as const,
        impactOnMarket: 'BEARISH' as const,
        reasoning: ['اخبار منفی زیاد است']
      };
      
      const result = adjustSignalBySentiment('BUY', 80, sentimentAnalysis);
      expect(result.adjustedConfidence).toBeLessThan(80);
    });
    
    it('باید سیگنال فروش را با اخبار مثبت تعدیل کند', () => {
      const sentimentAnalysis = {
        overallScore: 70,
        category: 'POSITIVE' as const,
        confidence: 75,
        newsCount: 5,
        breakdown: { positive: 3, neutral: 1, negative: 1 },
        trend: 'IMPROVING' as const,
        impactOnMarket: 'BULLISH' as const,
        reasoning: ['اخبار مثبت زیاد است']
      };
      
      const result = adjustSignalBySentiment('SELL', 75, sentimentAnalysis);
      expect(result.adjustedConfidence).toBeLessThan(75);
    });
  });
  
  describe('Multi-Layer Signal Aggregation', () => {
    it('باید تحلیل چندلایه کامل را انجام دهد', () => {
      const candles = generateTestCandles(50, 'UP');
      const newsItems = generateMockNews(7);
      
      const result = performMultiLayerAnalysis(
        candles,
        'BUY',
        75,
        newsItems,
        100000000,
        2
      );
      
      expect(result.finalSignal).toBeOneOf(['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL']);
      expect(result.finalConfidence).toBeGreaterThanOrEqual(0);
      expect(result.finalConfidence).toBeLessThanOrEqual(100);
      expect(result.layersPassed).toBeGreaterThanOrEqual(0);
      expect(result.layersPassed).toBeLessThanOrEqual(3);
      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
    
    it('باید گزارش تحلیلی تولید کند', () => {
      const candles = generateTestCandles(50);
      const newsItems = generateMockNews(7);
      
      const analysis = performMultiLayerAnalysis(candles, 'BUY', 70, newsItems);
      const report = generateAnalysisReport(analysis);
      
      expect(report).toContain('نبض بازار');
      expect(report).toContain('سیگنال نهایی');
      expect(report).toContain('امتیاز اطمینان');
      expect(report.length).toBeGreaterThan(100);
    });
    
    it('باید سیگنال HOLD را بدون تغییر نگه دارد', () => {
      const candles = generateTestCandles(50);
      const newsItems = generateMockNews(7);
      
      const result = performMultiLayerAnalysis(candles, 'HOLD', 50, newsItems);
      
      expect(result.finalSignal).toBe('HOLD');
      expect(result.finalConfidence).toBe(100);
    });
  });
  
  describe('Edge Cases', () => {
    it('باید با داده‌های ناکافی برخورد کند', () => {
      const candles = generateTestCandles(5); // داده کم
      const result = detectMarketRegime(candles);
      
      expect(result.regime).toBe('RANGING');
      expect(result.confidence).toBe(0);
    });
    
    it('باید با اخبار خالی برخورد کند', () => {
      const result = analyzeNewsSentiment([]);
      
      expect(result.overallScore).toBe(0);
      expect(result.category).toBe('NEUTRAL');
      expect(result.newsCount).toBe(0);
    });
    
    it('باید با پارامترهای نامعتبر در محاسبه حجم برخورد کند', () => {
      const result = calculatePositionSize({
        totalCapital: 100000000,
        riskPerTrade: 2,
        entryPrice: 0, // قیمت نامعتبر
        stopLoss: 9500
      });
      
      expect(result.shares).toBe(0);
      expect(result.positionSize).toBe(0);
    });
  });
});
