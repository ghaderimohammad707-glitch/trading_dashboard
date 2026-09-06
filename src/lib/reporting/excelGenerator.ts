/**
 * گزارش‌گیر اکسل - تولید فایل‌های xlsx حرفه‌ای
 * آرشیو کردن سیگنال‌ها و بک‌تست‌ها برای تحلیل‌های آفلاین
 */

import ExcelJS from 'exceljs';
import { CompositeSignal as Signal } from '../analysisEngines';
import { interpretSignal } from './signalReason';
import { PositionSizingOutput } from './positionSizer';

export interface ExcelReportOptions {
  filename?: string;
  includeSignals?: boolean;
  includeBacktest?: boolean;
  includePositionSizing?: boolean;
  language?: 'fa' | 'en';
}

export interface BacktestResult {
  symbol: string;
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  shares: number;
  profitLoss: number;
  profitLossPercent: number;
  strategy: string;
}

/**
 * ایجاد فایل اکسل با فرمت‌بندی فارسی
 */
export async function generateExcelReport(
  signals: Signal[],
  backtestResults?: BacktestResult[],
  positionSizes?: PositionSizingOutput[],
  options: ExcelReportOptions = { language: 'fa', includeSignals: true, includeBacktest: true, includePositionSizing: true }
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  
  // تنظیمات فونت فارسی
  const fontName = options.language === 'fa' ? 'B Nazanin' : 'Arial';
  
  // استایل‌های مشترک
  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 12, name: fontName },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }
  };
  
  const cellStyle: Partial<ExcelJS.Style> = {
    font: { size: 11, name: fontName },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }
  };
  
  const profitStyle = {
    ...cellStyle,
    font: { ...cellStyle.font, color: { argb: 'FF00AA00' }, bold: true }
  };
  
  const lossStyle = {
    ...cellStyle,
    font: { ...cellStyle.font, color: { argb: 'FFAA0000' }, bold: true }
  };

  // شیت ۱: سیگنال‌های لحظه‌ای
  if (options.includeSignals !== false && signals.length > 0) {
    const signalsSheet = workbook.addWorksheet(options.language === 'fa' ? 'سیگنال‌ها' : 'Signals');
    
    // هدرها
    const headers = options.language === 'fa'
      ? ['نماد', 'نوع سیگنال', 'قیمت فعلی', 'هدف', 'حد ضرر', 'امتیاز اطمینان', 'تاریخ', 'توضیحات']
      : ['Symbol', 'Signal Type', 'Current Price', 'Target', 'Stop Loss', 'Confidence', 'Date', 'Description'];
    
    signalsSheet.addRow(headers);
    const headerRow = signalsSheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.style = headerStyle;
    });
    
    // اضافه کردن داده‌ها
    signals.forEach(signal => {
      const interpretation = interpretSignal(signal);
      const row = signalsSheet.addRow([
        signal.symbol,
        signal.action === 'buy' ? (options.language === 'fa' ? 'خرید' : 'Buy') : (options.language === 'fa' ? 'فروش' : 'Sell'),
        signal.currentPrice,
        signal.targetPrice || '-',
        signal.stopLoss || '-',
        `${signal.confidence || 0}%`,
        new Date().toLocaleDateString('fa-IR'),
        interpretation.title
      ]);
      
      row.eachCell((cell, colNumber) => {
        cell.style = cellStyle;
        
        // رنگ‌آمیزی بر اساس نوع سیگنال
        if (colNumber === 2) { // نوع سیگنال
          if (signal.action === 'buy') {
            cell.font = { ...cellStyle.font, color: { argb: 'FF00AA00' }, bold: true };
          } else {
            cell.font = { ...cellStyle.font, color: { argb: 'FFAA0000' }, bold: true };
          }
        }
        
        // رنگ‌آمیزی امتیاز اطمینان
        if (colNumber === 6 && typeof signal.confidence === 'number') {
          if (signal.confidence >= 80) {
            cell.font = { ...cellStyle.font, color: { argb: 'FF00AA00' }, bold: true };
          } else if (signal.confidence < 50) {
            cell.font = { ...cellStyle.font, color: { argb: 'FFFFAA00' } };
          }
        }
      });
    });
    
    // تنظیم عرض ستون‌ها
    signalsSheet.columns.forEach(column => {
      column.width = 15;
    });
    signalsSheet.getColumn(8).width = 40; // ستون توضیحات عریض‌تر
  }

  // شیت ۲: نتایج بک‌تست
  if (backtestResults && backtestResults.length > 0) {
    const backtestSheet = workbook.addWorksheet(options.language === 'fa' ? 'بک‌تست' : 'Backtest');
    
    const headers = options.language === 'fa'
      ? ['نماد', 'استراتژی', 'تاریخ ورود', 'تاریخ خروج', 'قیمت ورود', 'قیمت خروج', 'تعداد', 'سود/زیان', 'درصد سود', 'وضعیت']
      : ['Symbol', 'Strategy', 'Entry Date', 'Exit Date', 'Entry Price', 'Exit Price', 'Shares', 'P/L', 'P/L %', 'Status'];
    
    backtestSheet.addRow(headers);
    const headerRow = backtestSheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.style = headerStyle;
    });
    
    backtestResults.forEach(result => {
      const isProfit = result.profitLoss >= 0;
      const row = backtestSheet.addRow([
        result.symbol,
        result.strategy,
        result.entryDate,
        result.exitDate,
        result.entryPrice,
        result.exitPrice,
        result.shares,
        result.profitLoss,
        `${result.profitLossPercent.toFixed(2)}%`,
        isProfit ? (options.language === 'fa' ? 'سود' : 'Profit') : (options.language === 'fa' ? 'زیان' : 'Loss')
      ]);
      
      row.eachCell((cell, colNumber) => {
        if (colNumber === 8 || colNumber === 9) { // ستون‌های سود/زیان
          cell.style = isProfit ? profitStyle : lossStyle;
          if (colNumber === 8) {
            cell.numFmt = '#,##0';
          }
        } else {
          cell.style = cellStyle;
        }
      });
    });
    
    // تنظیم عرض ستون‌ها
    backtestSheet.columns.forEach(column => {
      column.width = 14;
    });
    
    // اضافه کردن نمودار Equity Curve (ساده)
    // نکته: رسم نمودار در exceljs نیاز به افزونه دارد، اینجا فقط داده‌ها را آماده می‌کنیم
  }

  // شیت ۳: مدیریت سرمایه
  if (positionSizes && positionSizes.length > 0) {
    const positionSheet = workbook.addWorksheet(options.language === 'fa' ? 'مدیریت سرمایه' : 'Position Sizing');
    
    const headers = options.language === 'fa'
      ? ['نماد', 'تعداد سهم', 'ارزش پوزیشن', 'ریسک ریالی', 'اهرم پیشنهادی', 'وضعیت']
      : ['Symbol', 'Share Count', 'Position Value', 'Risk Amount', 'Suggested Leverage', 'Status'];
    
    positionSheet.addRow(headers);
    const headerRow = positionSheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.style = headerStyle;
    });
    
    positionSizes.forEach((position, index) => {
      const signal = signals[index];
      const row = positionSheet.addRow([
        signal?.symbol || '-',
        position.shareCount,
        position.positionValue,
        position.riskAmount,
        position.suggestedLeverage,
        position.isValid ? (options.language === 'fa' ? 'معتبر' : 'Valid') : (options.language === 'fa' ? 'نامعتبر' : 'Invalid')
      ]);
      
      row.eachCell((cell, colNumber) => {
        cell.style = cellStyle;
        
        if (colNumber === 6) { // ستون وضعیت
          cell.font = {
            ...cellStyle.font,
            color: { argb: position.isValid ? 'FF00AA00' : 'FFAA0000' },
            bold: true
          };
        }
        
        if (colNumber >= 2 && colNumber <= 4) {
          cell.numFmt = '#,##0';
        }
      });
    });
    
    positionSheet.columns.forEach(column => {
      column.width = 16;
    });
  }

  // تولید بافر فایل
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * تولید سریع گزارش سیگنال‌ها
 */
export async function generateSignalsExcel(
  signals: Signal[],
  filename: string = 'signals_report.xlsx',
  language: 'fa' | 'en' = 'fa'
): Promise<Buffer> {
  return generateExcelReport(signals, undefined, undefined, {
    filename,
    includeSignals: true,
    language
  });
}

/**
 * تولید گزارش بک‌تست
 */
export async function generateBacktestExcel(
  backtestResults: BacktestResult[],
  filename: string = 'backtest_report.xlsx',
  language: 'fa' | 'en' = 'fa'
): Promise<Buffer> {
  return generateExcelReport([], backtestResults, undefined, {
    filename,
    includeBacktest: true,
    language
  });
}

/**
 * محاسبه خلاصه آماری از نتایج بک‌تست
 */
export function calculateBacktestStats(backtestResults: BacktestResult[]) {
  if (backtestResults.length === 0) {
    return null;
  }
  
  const totalTrades = backtestResults.length;
  const winningTrades = backtestResults.filter(r => r.profitLoss > 0).length;
  const losingTrades = backtestResults.filter(r => r.profitLoss <= 0).length;
  const winRate = (winningTrades / totalTrades) * 100;
  
  const totalProfit = backtestResults.reduce((sum, r) => sum + r.profitLoss, 0);
  const avgProfit = totalProfit / totalTrades;
  
  const maxWin = Math.max(...backtestResults.map(r => r.profitLoss));
  const maxLoss = Math.min(...backtestResults.map(r => r.profitLoss));
  
  const grossProfit = backtestResults.filter(r => r.profitLoss > 0)
    .reduce((sum, r) => sum + r.profitLoss, 0);
  const grossLoss = Math.abs(backtestResults.filter(r => r.profitLoss < 0)
    .reduce((sum, r) => sum + r.profitLoss, 0));
  
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : Infinity;
  
  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate: parseFloat(winRate.toFixed(2)),
    totalProfit,
    avgProfit: parseFloat(avgProfit.toFixed(2)),
    maxWin,
    maxLoss,
    grossProfit,
    grossLoss,
    profitFactor: profitFactor === Infinity ? Infinity : parseFloat(profitFactor.toFixed(2))
  };
}
