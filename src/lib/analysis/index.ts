/**
 * کتابخانه تحلیل هوشمند بازار بورس تهران
 * تمام موتورها بر اساس داده‌های واقعی TSETMC کار می‌کنند - بدون داده فیک
 */

// سرویس داده بازار
export {
  fetchRealTimeData,
  fetchHistoricalData,
  fetchActiveSymbols,
  type RealTimeData,
  type HistoricalData,
} from './marketDataService';

// موتور تحلیل تکنیکال
export {
  analyzeTechnical,
  type TechnicalIndicators,
} from './technicalEngine';

// موتور تحلیل پول هوشمند
export {
  analyzeSmartMoney,
  detectSuspiciousBlocks,
  calculatePerCapita,
  type SmartMoneyAnalysis,
} from './smartMoneyEngine';

// موتور تحلیل بنیادی
export {
  analyzeFundamental,
  compareFundamentals,
  type FundamentalAnalysis,
} from './fundamentalEngine';

// موتور تولید سیگنال
export {
  generateCompleteSignal,
  evaluateSignal,
  type CompleteSignal,
} from './signalGenerator';

// موتور مدیریت پرتفوی
export {
  analyzePortfolio,
  simulateRebalance,
  type PortfolioItem,
  type PortfolioAnalysis,
  type InvestmentRecommendation,
} from './portfolioManager';
