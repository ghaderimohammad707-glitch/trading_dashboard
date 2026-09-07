/**
 * نقطه ورود اصلی برای ماژول گزارش‌دهی
 * فاز ۴: رابط کاربری حرفه‌ای و گزارش‌دهی
 */

export {
  calculatePositionSize,
  calculatePositionSizeWithFees,
  calculateRiskRewardRatio,
  calculateBreakEvenPoint,
  type PositionSizingInput,
  type PositionSizingOutput
} from './positionSizer';

export {
  interpretSignal,
  getQuickSignalSummary,
  interpretMultipleSignals,
  type SignalReasonOutput
} from './signalReason';

export {
  generateExcelReport,
  generateSignalsExcel,
  generateBacktestExcel,
  calculateBacktestStats,
  type ExcelReportOptions,
  type BacktestResult
} from './excelGenerator';

export {
  generatePDFReport,
  generateSingleSignalPDF,
  type PDFReportOptions
} from './pdfGenerator';
