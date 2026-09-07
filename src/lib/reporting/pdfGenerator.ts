/**
 * گزارش‌گیر PDF - تولید گزارش‌های رسمی و قابل چاپ
 * ارائه گزارش‌های حرفه‌ای به کاربران یا مدیران صندوق
 * با پشتیبانی از فونت فارسی B Nazanin
 */

import PDFDocument from 'pdfkit';
import { CompositeSignal as Signal } from '../analysisEngines';
import { interpretSignal, SignalReasonOutput } from './signalReason';
import { BacktestResult, calculateBacktestStats } from './excelGenerator';
import { PositionSizingOutput } from './positionSizer';
import * as fs from 'fs';
import * as path from 'path';

export interface PDFReportOptions {
  title: string;
  subtitle?: string;
  includeCoverPage?: boolean;
  includeTableOfContents?: boolean;
  language?: 'fa' | 'en';
  pageSize?: 'A4' | 'Letter';
}

interface PDFSection {
  title: string;
  content: string;
  page?: number;
}

/**
 * مسیر فونت فارسی را پیدا می‌کند
 */
function getPersianFontPath(): string | null {
  const possibleFonts = [
    path.join(__dirname, '../../assets/fonts/BNazanin.ttf'),
    path.join(process.cwd(), 'assets/fonts/BNazanin.ttf'),
    path.join(process.cwd(), 'src/assets/fonts/BNazanin.ttf'),
    '/usr/share/fonts/truetype/BNazanin.ttf',
    '/usr/share/fonts/BNazanin.ttf'
  ];
  
  for (const fontPath of possibleFonts) {
    if (fs.existsSync(fontPath)) {
      return fontPath;
    }
  }
  
  return null;
}

/**
 * فونت فارسی را به سند PDF اضافه می‌کند
 */
function registerPersianFont(doc: PDFKit.PDFDocument): string {
  const persianFontPath = getPersianFontPath();
  
  if (persianFontPath) {
    try {
      doc.font(persianFontPath);
      return 'persian';
    } catch (error) {
      console.warn('Failed to load Persian font:', error);
    }
  }
  
  // استفاده از فونت پیش‌فرض که از یونیکد پشتیبانی می‌کند
  doc.font('Helvetica');
  return 'Helvetica';
}

/**
 * تولید گزارش PDF از سیگنال‌ها و تحلیل‌ها
 */
export async function generatePDFReport(
  signals: Signal[],
  backtestResults?: BacktestResult[],
  positionSizes?: PositionSizingOutput[],
  options: PDFReportOptions = { title: 'گزارش', language: 'fa', includeCoverPage: true, includeTableOfContents: false }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: (options || {}). pageSize || 'A4',
        margins: { top: 50, bottom: 50, left: 40, right: 40 }
      });
      
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // ثبت فونت فارسی در صورت وجود
      const fontName = (options || {}). language === 'fa' ? registerPersianFont(doc) : 'Helvetica';
      
      // صفحه جلد
      if (options.includeCoverPage !== false) {
        addCoverPage(doc, options, fontName);
      }
      
      // فهرست مطالب
      if (options.includeTableOfContents) {
        addTableOfContents(doc, options, fontName);
      }
      
      // خلاصه مدیریتی
      addExecutiveSummary(doc, signals, backtestResults, options, fontName);
      
      // جدول سیگنال‌ها
      if (signals.length > 0) {
        addSignalsTable(doc, signals, options, fontName);
      }
      
      // نتایج بک‌تست
      if (backtestResults && backtestResults.length > 0) {
        addBacktestResults(doc, backtestResults, options, fontName);
      }
      
      // مدیریت سرمایه
      if (positionSizes && positionSizes.length > 0) {
        addPositionSizing(doc, signals, positionSizes, options, fontName);
      }
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * اضافه کردن صفحه جلد
 */
function addCoverPage(
  doc: PDFKit.PDFDocument,
  options: PDFReportOptions,
  fontName: string
): void {
  doc.addPage();
  
  doc.font(fontName)
    .fontSize(24)
    .text(options.title, 50, 200, { align: 'center' });
  
  if (options.subtitle) {
    doc.fontSize(16)
      .text(options.subtitle || '', 50, 240, { align: 'center' });
  }
  
  doc.fontSize(12)
    .text(`تاریخ گزارش: ${new Date().toLocaleDateString('fa-IR')}`, 50, 300, { align: 'center' })
    .text(`تعداد سیگنال‌ها: ${options.title.includes('سیگنال') ? 'محاسبه خواهد شد' : '-'}`, 50, 330, { align: 'center' });
  
  // خط تزئینی
  doc.moveTo(100, 400)
    .lineTo(500, 400)
    .stroke();
}

/**
 * اضافه کردن فهرست مطالب
 */
function addTableOfContents(
  doc: PDFKit.PDFDocument,
  options: PDFReportOptions,
  fontName: string
): void {
  doc.addPage();
  
  doc.font(fontName)
    .fontSize(18)
    .text(options.language === 'fa' ? 'فهرست مطالب' : 'Table of Contents', 50, 50, { align: 'center' });
  
  const sections = [
    options.language === 'fa' ? 'خلاصه مدیریتی' : 'Executive Summary',
    options.language === 'fa' ? 'سیگنال‌های فعال' : 'Active Signals',
    options.language === 'fa' ? 'نتایج بک‌تست' : 'Backtest Results',
    options.language === 'fa' ? 'مدیریت سرمایه' : 'Position Sizing'
  ];
  
  doc.fontSize(12);
  sections.forEach((section, index) => {
    doc.text(`${index + 1}. ${section}`, 50, 100 + (index * 30));
  });
}

/**
 * اضافه کردن خلاصه مدیریتی
 */
function addExecutiveSummary(
  doc: PDFKit.PDFDocument,
  signals: Signal[],
  backtestResults: BacktestResult[] | undefined,
  options: PDFReportOptions,
  fontName: string
): void {
  doc.addPage();
  
  doc.font(fontName)
    .fontSize(18)
    .text(options.language === 'fa' ? 'خلاصه مدیریتی' : 'Executive Summary', 50, 50, { align: 'left' });
  
  doc.fontSize(12)
    .text(`تاریخ گزارش: ${new Date().toLocaleDateString('fa-IR')}`, 50, 90);
  
  // آمار سیگنال‌ها
  const buySignals = signals.filter(s => s.action === 'buy').length;
  const sellSignals = signals.filter(s => s.action === 'sell').length;
  const avgConfidence = signals.length > 0
    ? (signals.reduce((sum, s) => sum + (s.confidence || 0), 0) / signals.length).toFixed(1)
    : '0';
  
  doc.fontSize(14)
    .text(options.language === 'fa' ? 'آمار سیگنال‌ها:' : 'Signals Statistics:', 50, 130);
  
  doc.fontSize(12)
    .text(`• ${options.language === 'fa' ? 'کل سیگنال‌ها' : 'Total Signals'}: ${signals.length}`, 60, 155)
    .text(`• ${options.language === 'fa' ? 'سیگنال‌های خرید' : 'Buy Signals'}: ${buySignals}`, 60, 175)
    .text(`• ${options.language === 'fa' ? 'سیگنال‌های فروش' : 'Sell Signals'}: ${sellSignals}`, 60, 195)
    .text(`• ${options.language === 'fa' ? 'میانگین اطمینان' : 'Average Confidence'}: ${avgConfidence}%`, 60, 215);
  
  // آمار بک‌تست
  if (backtestResults && backtestResults.length > 0) {
    const stats = calculateBacktestStats(backtestResults);
    
    if (stats) {
      doc.fontSize(14)
        .text(options.language === 'fa' ? 'آمار بک‌تست:' : 'Backtest Statistics:', 50, 255);
      
      doc.fontSize(12)
        .text(`• ${options.language === 'fa' ? 'تعداد معاملات' : 'Total Trades'}: ${stats.totalTrades}`, 60, 280)
        .text(`• ${options.language === 'fa' ? 'نرخ برد' : 'Win Rate'}: ${stats.winRate}%`, 60, 300)
        .text(`• ${options.language === 'fa' ? 'سود کل' : 'Total Profit'}: ${stats.totalProfit.toLocaleString()}`, 60, 320)
        .text(`• ${options.language === 'fa' ? 'ضریب سود' : 'Profit Factor'}: ${stats.profitFactor}`, 60, 340);
    }
  }
}

/**
 * اضافه کردن جدول سیگنال‌ها
 */
function addSignalsTable(
  doc: PDFKit.PDFDocument,
  signals: Signal[],
  options: PDFReportOptions,
  fontName: string
): void {
  doc.addPage();
  
  doc.font(fontName)
    .fontSize(18)
    .text(options.language === 'fa' ? 'سیگنال‌های فعال' : 'Active Signals', 50, 50, { align: 'left' });
  
  const headers = options.language === 'fa'
    ? ['نماد', 'نوع', 'قیمت', 'هدف', 'حد ضرر', 'اطمینان']
    : ['Symbol', 'Type', 'Price', 'Target', 'Stop', 'Conf'];
  
  let y = 90;
  const rowHeight = 20;
  
  // هدر جدول
  doc.fontSize(12).font(fontName).font("Helvetica-Bold");
  headers.forEach((header, i) => {
    doc.text(header, 50 + (i * 80), y);
  });
  
  doc.moveTo(50, y + 15)
    .lineTo(550, y + 15)
    .stroke();
  
  y += rowHeight;
  
  // داده‌ها
  doc.fontSize(10).font("Helvetica");
  signals.slice(0, 25).forEach(signal => { // حداکثر ۲۵ سیگنال در هر صفحه
    const interpretation = interpretSignal(signal);
    
    doc.text(signal.symbol, 50, y);
    doc.text(signal.action === 'buy' ? 'خرید' : 'فروش', 130, y);
    doc.text((signal.currentPrice || 0).toLocaleString(), 210, y);
    doc.text(signal.targetPrice?.toLocaleString() || '-', 290, y);
    doc.text(signal.stopLoss?.toLocaleString() || '-', 370, y);
    doc.text(`${signal.confidence || 0}%`, 450, y);
    
    y += rowHeight;
    
    // اگر به انتهای صفحه رسیدیم، صفحه جدید
    if (y > 750) {
      doc.addPage();
      y = 50;
    }
  });
}

/**
 * اضافه کردن نتایج بک‌تست
 */
function addBacktestResults(
  doc: PDFKit.PDFDocument,
  backtestResults: BacktestResult[],
  options: PDFReportOptions,
  fontName: string
): void {
  doc.addPage();
  
  doc.font(fontName)
    .fontSize(18)
    .text(options.language === 'fa' ? 'نتایج بک‌تست' : 'Backtest Results', 50, 50, { align: 'left' });
  
  const stats = calculateBacktestStats(backtestResults);
  
  if (stats) {
    doc.fontSize(12)
      .text(`${options.language === 'fa' ? 'تعداد معاملات' : 'Total Trades'}: ${stats.totalTrades}`, 50, 90)
      .text(`${options.language === 'fa' ? 'نرخ برد' : 'Win Rate'}: ${stats.winRate}%`, 250, 90)
      .text(`${options.language === 'fa' ? 'سود کل' : 'Total Profit'}: ${stats.totalProfit.toLocaleString()}`, 50, 110)
      .text(`${options.language === 'fa' ? 'ضریب سود' : 'Profit Factor'}: ${stats.profitFactor}`, 250, 110);
  }
  
  // جدول معاملات
  const headers = options.language === 'fa'
    ? ['نماد', 'استراتژی', 'ورود', 'خروج', 'سود/زیان']
    : ['Symbol', 'Strategy', 'Entry', 'Exit', 'P/L'];
  
  let y = 160;
  const rowHeight = 18;
  
  doc.fontSize(11).font("Helvetica-Bold");
  headers.forEach((header, i) => {
    doc.text(header, 50 + (i * 100), y);
  });
  
  doc.moveTo(50, y + 15)
    .lineTo(550, y + 15)
    .stroke();
  
  y += rowHeight;
  
  doc.fontSize(10).font("Helvetica");
  backtestResults.slice(0, 30).forEach(result => {
    const isProfit = result.profitLoss >= 0;
    
    doc.text(result.symbol, 50, y);
    doc.text(result.strategy.substring(0, 15), 130, y);
    doc.text(result.entryDate, 230, y);
    doc.text(result.exitDate, 330, y);
    
    doc.fillColor(isProfit ? '#00AA00' : '#AA0000');
    doc.text(`${result.profitLoss.toLocaleString()} (${result.profitLossPercent.toFixed(1)}%)`, 430, y);
    doc.fillColor('#000000');
    
    y += rowHeight;
    
    if (y > 750) {
      doc.addPage();
      y = 50;
    }
  });
}

/**
 * اضافه کردن بخش مدیریت سرمایه
 */
function addPositionSizing(
  doc: PDFKit.PDFDocument,
  signals: Signal[],
  positionSizes: PositionSizingOutput[],
  options: PDFReportOptions,
  fontName: string
): void {
  doc.addPage();
  
  doc.font(fontName)
    .fontSize(18)
    .text(options.language === 'fa' ? 'مدیریت سرمایه' : 'Position Sizing', 50, 50, { align: 'left' });
  
  const headers = options.language === 'fa'
    ? ['نماد', 'تعداد سهم', 'ارزش پوزیشن', 'ریسک', 'وضعیت']
    : ['Symbol', 'Shares', 'Value', 'Risk', 'Status'];
  
  let y = 90;
  const rowHeight = 20;
  
  doc.fontSize(12).font("Helvetica-Bold");
  headers.forEach((header, i) => {
    doc.text(header, 50 + (i * 100), y);
  });
  
  doc.moveTo(50, y + 15)
    .lineTo(550, y + 15)
    .stroke();
  
  y += rowHeight;
  
  doc.fontSize(10).font("Helvetica");
  positionSizes.slice(0, 25).forEach((position, index) => {
    const signal = signals[index];
    
    doc.text(signal?.symbol || '-', 50, y);
    doc.text(position.shareCount.toLocaleString(), 130, y);
    doc.text(position.positionValue.toLocaleString(), 230, y);
    doc.text(position.riskAmount.toLocaleString(), 330, y);
    
    doc.fillColor(position.isValid ? '#00AA00' : '#AA0000');
    doc.text(position.isValid ? '✓' : '✗', 430, y);
    doc.fillColor('#000000');
    
    y += rowHeight;
    
    if (y > 750) {
      doc.addPage();
      y = 50;
    }
  });
}

/**
 * تولید سریع گزارش تک‌صفحه‌ای سیگنال
 */
export async function generateSingleSignalPDF(
  signal: Signal,
  options: PDFReportOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4' });
    const chunks: Buffer[] = [];
    
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    
    const interpretation = interpretSignal(signal);
    
    doc.fontSize(20).text(interpretation.title, 50, 50);
    doc.fontSize(14).text(interpretation.description, 50, 100, { width: 500, lineGap: 10 });
    
    doc.fontSize(12)
      .text(`نماد: ${signal.symbol}`, 50, 250)
      .text(`قیمت فعلی: ${(signal.currentPrice || 0).toLocaleString()}`, 50, 270)
      .text(`هدف قیمتی: ${signal.targetPrice?.toLocaleString() || '-'}`, 50, 290)
      .text(`حد ضرر: ${signal.stopLoss?.toLocaleString() || '-'}`, 50, 310)
      .text(`امتیاز اطمینان: ${signal.confidence || 0}%`, 50, 330);
    
    doc.fontSize(12)
      .text(options.language === 'fa' ? 'دلایل تکنیکال:' : 'Technical Reasons:', 50, 380);
    interpretation.technicalReasons.forEach((reason, i) => {
      doc.text(`• ${reason}`, 60, 400 + (i * 20));
    });
    
    doc.fontSize(12)
      .text(options.language === 'fa' ? 'دلایل تابلوخوانی:' : 'Tableau Reasons:', 50, 500);
    interpretation.tableauReasons.forEach((reason, i) => {
      doc.text(`• ${reason}`, 60, 520 + (i * 20));
    });
    
    doc.end();
  });
}
