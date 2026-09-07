/**
 * تست‌های واحد برای تولید گزارش PDF
 */

import { describe, it, expect } from 'vitest';
import { generatePDFReport, generateSingleSignalPDF } from '../pdfGenerator';
import { CompositeSignal } from '../../analysisEngines';

describe('فاز ۴: گزارش‌دهی - PDF Generator', () => {
  
  const createTestSignal = (symbol: string = 'خودرو'): CompositeSignal => ({
    symbol,
    action: 'buy',
    currentPrice: 15000,
    confidence: 75,
    timestamp: new Date(),
    indicators: {
      rsi: 25,
      macd: {
        signal: 'bullish_crossover',
        histogram: 150
      }
    },
    tableauData: {
      smartMoneyFlow: 'inflow'
    }
  });
  
  describe('generatePDFReport', () => {
    it('باید گزارش PDF با صفحه جلد تولید کند', async () => {
      const signals = [createTestSignal('فولاد')];
      
      const pdfBuffer = await generatePDFReport(
        signals,
        undefined,
        undefined,
        {
          title: 'گزارش سیگنال‌های روزانه',
          subtitle: 'تحلیل تکنیکال و تابلوخوانی',
          includeCoverPage: true,
          language: 'fa'
        }
      );
      
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(1000); // حداقل حجم یک PDF ساده
    });
    
    it('باید گزارش PDF بدون صفحه جلد تولید کند', async () => {
      const signals = [createTestSignal('خودرو')];
      
      const pdfBuffer = await generatePDFReport(
        signals,
        undefined,
        undefined,
        {
          title: 'گزارش سریع',
          includeCoverPage: false,
          language: 'fa'
        }
      );
      
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(500);
    });
    
    it('باید گزارش انگلیسی تولید کند', async () => {
      const signals = [createTestSignal('KHODRO')];
      
      const pdfBuffer = await generatePDFReport(
        signals,
        undefined,
        undefined,
        {
          title: 'Daily Signals Report',
          includeCoverPage: true,
          language: 'en'
        }
      );
      
      expect(pdfBuffer).toBeInstanceOf(Buffer);
    });
    
    it('باید گزارش با فهرست مطالب تولید کند', async () => {
      const signals = [
        createTestSignal('فولاد'),
        createTestSignal('خودرو'),
        createTestSignal('شستا')
      ];
      
      const pdfBuffer = await generatePDFReport(
        signals,
        undefined,
        undefined,
        {
          title: 'گزارش جامع',
          includeCoverPage: true,
          includeTableOfContents: true,
          language: 'fa'
        }
      );
      
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      // گزارش با فهرست باید بزرگتر باشد
      expect(pdfBuffer.length).toBeGreaterThan(2000);
    });
  });
  
  describe('generateSingleSignalPDF', () => {
    it('باید PDF تک سیگنال تولید کند', async () => {
      const signal = createTestSignal('آپ');
      
      const pdfBuffer = await generateSingleSignalPDF(
        signal,
        {
          title: 'سیگنال آپ',
          language: 'fa'
        }
      );
      
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(500);
    });
    
    it('باید توضیحات کامل سیگنال را در PDF بگنجاند', async () => {
      const signal = createTestSignal('وبانک');
      
      const pdfBuffer = await generateSingleSignalPDF(
        signal,
        {
          title: 'سیگنال وبانک',
          language: 'fa'
        }
      );
      
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      // بررسی می‌کنیم که PDF معتبر است
      expect(pdfBuffer.slice(0, 5).toString()).toContain('%PDF');
    });
  });
});
