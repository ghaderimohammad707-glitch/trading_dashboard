/**
 * نقطه ورود اصلی برای تمام موتورهای تحلیل
 * استفاده آسان از تمام قابلیت‌های تحلیل در یک جا
 */

export { analyzeTechnical } from './technicalEngine';
export type { TechnicalSignal, TechnicalIndicators } from './technicalEngine';

export { analyzeSmartMoneyFlow } from './smartMoneyEngine';
export type { SmartMoneyAnalysis } from './smartMoneyEngine';

export { analyzeFundamental } from './fundamentalEngine';
export type { FundamentalAnalysis } from './fundamentalEngine';

export { generateCompleteSignal } from './signalGenerator';
export type { CompleteSignal } from './signalGenerator';

export { 
  analyzePortfolio, 
  generateInvestmentAdvice, 
  generatePortfolioReport 
} from './portfolioManager';
export type { 
  PortfolioHolding, 
  PortfolioAnalysis, 
  PortfolioRecommendation, 
  InvestmentAdvice 
} from './portfolioManager';
