/**
 * سرویس مدیریت سیگنال‌ها و پرتفوی کاربر
 * وظیفه: تولید سیگنال نهایی، مدیریت پرتفوی، ارائه مشاوره سرمایه‌گذاری
 * قانون: تمام توصیه‌ها مبتنی بر داده‌های واقعی و تحلیل چندلایه هستند.
 */

import { technicalEngine, type AnalysisResult } from './TechnicalAnalysisEngine';
import { fundamentalEngine, type FundamentalScore } from './FundamentalAnalysisEngine';
import { sentimentEngine, type SmartMoneyFlow } from './SentimentAnalysisEngine';
import type { Signal, StockData, FinancialStatement, MonthlyReport, DividendInfo } from '@/types/market';
import { generateSecureId } from '@/lib/cryptoRandom';

export interface CombinedSignal {
  signal: Signal;
  technicalAnalysis: AnalysisResult;
  fundamentalAnalysis?: FundamentalScore;
  sentimentAnalysis?: SmartMoneyFlow;
  finalScore: number; // امتیاز نهایی ترکیبی
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  confidenceLevel: 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW';
  detailedReasons: string[];
  investmentAdvice?: InvestmentAdvice;
}

export interface InvestmentAdvice {
  action: 'BUY' | 'SELL' | 'HOLD' | 'WAIT';
  assetType: string; // نوع دارایی پیشنهادی
  entryPrice: number;
  targetPrices: number[];
  stopLoss: number;
  positionSize: number; // درصد از پرتفوی
  holdingPeriod: 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
  rationale: string[]; // دلایل کامل توصیه
  risks: string[]; // ریسک‌های شناسایی شده
  specificInstrument?: string; // نام دقیق instrument (مثلاً صندوق عیار)
}

export interface PortfolioItem {
  symbol: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  purchaseDate: number;
  notes?: string;
}

export interface PortfolioAnalysis {
  totalValue: number;
  totalCost: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  items: (PortfolioItem & {
    profitLoss: number;
    profitLossPercent: number;
    weight: number; // وزن در پرتفو
    signal?: CombinedSignal;
  })[];
  diversificationScore: number; // امتیاز تنوع‌بخشی
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  recommendations: string[]; // توصیه‌های بهبود پرتفو
}

class SignalAndPortfolioService {
  
  /**
   * تولید سیگنال ترکیبی با استفاده از تمام موتورها
   */
  async generateCombinedSignal(
    stockData: StockData,
    statements?: FinancialStatement[],
    monthlyReports?: MonthlyReport[],
    dividends?: DividendInfo[]
  ): Promise<CombinedSignal> {
    const detailedReasons: string[] = [];
    
    // تحلیل تکنیکال (همیشه اجرا می‌شود)
    const technicalAnalysis = await technicalEngine.analyzeSymbol(stockData);
    detailedReasons.push(...technicalAnalysis.reasons.map(r => `📊 تکنیکال: ${r}`));
    
    // تحلیل احساسات (همیشه اجرا می‌شود)
    const sentimentAnalysis = await sentimentEngine.analyzeSentiment(stockData);
    detailedReasons.push(...sentimentAnalysis.reasons.map(r => `💰 جریان پول: ${r}`));
    
    // تحلیل بنیادی (در صورت وجود داده)
    let fundamentalAnalysis: FundamentalScore | undefined;
    if (statements && statements.length > 0) {
      fundamentalAnalysis = await fundamentalEngine.analyzeSymbol(
        stockData.symbol,
        stockData,
        statements,
        monthlyReports || [],
        dividends || []
      );
      detailedReasons.push(...fundamentalAnalysis.reasons.map(r => `📈 بنیادی: ${r}`));
    }
    
    // محاسبه امتیاز نهایی با وزن‌دهی
    let finalScore = technicalAnalysis.score * 0.4 + 
                     ((sentimentAnalysis.flowScore + 100) / 2) * 0.3;
    
    if (fundamentalAnalysis) {
      finalScore += fundamentalAnalysis.totalScore * 0.3;
    } else {
      finalScore += 50 * 0.3; // نمره خنثی اگر داده بنیادی نداریم
    }
    
    finalScore = Math.max(0, Math.min(100, finalScore));
    
    // تعیین توصیه نهایی
    let recommendation: CombinedSignal['recommendation'] = 'HOLD';
    let confidenceLevel: CombinedSignal['confidenceLevel'] = 'MODERATE';
    
    if (finalScore >= 80) {
      recommendation = 'STRONG_BUY';
      confidenceLevel = 'VERY_HIGH';
    } else if (finalScore >= 65) {
      recommendation = 'BUY';
      confidenceLevel = 'HIGH';
    } else if (finalScore >= 55) {
      recommendation = 'HOLD';
      confidenceLevel = 'MODERATE';
    } else if (finalScore >= 35) {
      recommendation = 'SELL';
      confidenceLevel = 'HIGH';
    } else {
      recommendation = 'STRONG_SELL';
      confidenceLevel = 'VERY_HIGH';
    }
    
    // ساخت سیگنال
    const signalType: Signal['type'] = 
      recommendation.includes('BUY') ? 'BUY' : 
      recommendation.includes('SELL') ? 'SELL' : 'HOLD';
    
    const signal: Signal = {
      id: generateSecureId(16),
      symbol: stockData.symbol,
      type: signalType,
      strength: technicalAnalysis.strength,
      generatedAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 روز اعتبار
      entryPoint: technicalAnalysis.entryPoint || stockData.currentPrice,
      stopLoss: technicalAnalysis.stopLoss || stockData.currentPrice * 0.9,
      takeProfits: technicalAnalysis.takeProfits || [stockData.currentPrice * 1.1],
      confidence: Math.round(finalScore),
      reasons: detailedReasons,
      status: 'PENDING'
    };
    
    // تولید مشاوره سرمایه‌گذاری
    const investmentAdvice: InvestmentAdvice | undefined = 
      recommendation !== 'HOLD' ? {
        action: signalType === 'BUY' ? 'BUY' : signalType === 'SELL' ? 'SELL' : 'HOLD',
        assetType: this.getAssetType(stockData),
        entryPrice: signal.entryPoint,
        targetPrices: signal.takeProfits,
        stopLoss: signal.stopLoss,
        positionSize: this.calculatePositionSize(confidenceLevel, recommendation),
        holdingPeriod: this.determineHoldingPeriod(fundamentalAnalysis),
        rationale: detailedReasons.slice(0, 5),
        risks: this.identifyRisks(technicalAnalysis, sentimentAnalysis, fundamentalAnalysis),
        specificInstrument: this.suggestSpecificInstrument(stockData.symbol, fundamentalAnalysis)
      } : undefined;
    
    return {
      signal,
      technicalAnalysis,
      fundamentalAnalysis,
      sentimentAnalysis,
      finalScore: Math.round(finalScore),
      recommendation,
      confidenceLevel,
      detailedReasons,
      investmentAdvice
    };
  }
  
  /**
   * تحلیل پرتفوی کاربر
   */
  async analyzePortfolio(
    portfolioItems: PortfolioItem[],
    currentPrices: Map<string, number>
  ): Promise<PortfolioAnalysis> {
    const analyzedItems = portfolioItems.map(item => {
      const currentPrice = currentPrices.get(item.symbol) || item.currentPrice;
      const profitLoss = (currentPrice - item.avgBuyPrice) * item.quantity;
      const profitLossPercent = ((currentPrice - item.avgBuyPrice) / item.avgBuyPrice) * 100;
      
      return {
        ...item,
        currentPrice,
        profitLoss,
        profitLossPercent,
        weight: 0 // بعداً محاسبه می‌شود
      };
    });
    
    const totalValue = analyzedItems.reduce((sum, item) => sum + (item.currentPrice * item.quantity), 0);
    const totalCost = analyzedItems.reduce((sum, item) => sum + (item.avgBuyPrice * item.quantity), 0);
    const totalProfitLoss = totalValue - totalCost;
    const totalProfitLossPercent = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;
    
    // محاسبه وزن هر دارایی
    analyzedItems.forEach(item => {
      item.weight = totalValue > 0 ? (item.currentPrice * item.quantity) / totalValue : 0;
    });
    
    // محاسبه امتیاز تنوع‌بخشی
    const diversificationScore = this.calculateDiversificationScore(analyzedItems);
    
    // تعیین سطح ریسک
    const riskLevel = this.assessPortfolioRisk(analyzedItems, diversificationScore);
    
    // تولید توصیه‌ها
    const recommendations = this.generatePortfolioRecommendations(analyzedItems, diversificationScore, riskLevel);
    
    return {
      totalValue,
      totalCost,
      totalProfitLoss,
      totalProfitLossPercent,
      items: analyzedItems,
      diversificationScore,
      riskLevel,
      recommendations
    };
  }
  
  /**
   * محاسبه اندازه پوزیشن بر اساس اطمینان
   */
  private calculatePositionSize(
    confidence: CombinedSignal['confidenceLevel'],
    recommendation: CombinedSignal['recommendation']
  ): number {
    if (recommendation === 'STRONG_BUY') {
      switch (confidence) {
        case 'VERY_HIGH': return 25; // حداکثر 25% پرتفو
        case 'HIGH': return 20;
        case 'MODERATE': return 15;
        default: return 10;
      }
    } else if (recommendation === 'BUY') {
      switch (confidence) {
        case 'VERY_HIGH': return 20;
        case 'HIGH': return 15;
        case 'MODERATE': return 10;
        default: return 5;
      }
    }
    return 0;
  }
  
  /**
   * تعیین دوره نگهداری
   */
  private determineHoldingPeriod(fundamental?: FundamentalScore): 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM' {
    if (!fundamental) return 'SHORT_TERM';
    
    if (fundamental.recommendation === 'STRONG_BUY' && fundamental.growthScore >= 70) {
      return 'LONG_TERM';
    } else if (fundamental.totalScore >= 65) {
      return 'MEDIUM_TERM';
    }
    return 'SHORT_TERM';
  }
  
  /**
   * شناسایی ریسک‌ها
   */
  private identifyRisks(
    technical: AnalysisResult,
    sentiment: SmartMoneyFlow,
    fundamental?: FundamentalScore
  ): string[] {
    const risks: string[] = [];
    
    if (technical.trend === 'BEARISH') {
      risks.push('روند نزولی قیمت');
    }
    
    if (sentiment.flowScore < -30) {
      risks.push('خروج پول هوشمند');
    }
    
    if (fundamental && fundamental.financialHealthScore < 50) {
      risks.push('ضعف بنیادی شرکت');
    }
    
    if (technical.indicators.rsi && technical.indicators.rsi > 75) {
      risks.push('اشباع خرید شدید - احتمال اصلاح');
    }
    
    if (risks.length === 0) {
      risks.push('ریسک‌های عمومی بازار');
    }
    
    return risks;
  }
  
  /**
   * پیشنهاد instrument خاص
   */
  private suggestSpecificInstrument(symbol: string, fundamental?: FundamentalScore): string {
    // این تابع باید به دیتابیس صندوق‌ها متصل شود
    // فعلاً بر اساس نماد پیشنهاد ساده می‌دهد
    if (symbol.includes('طلا') || symbol.includes('عیار')) {
      return 'صندوق طلای عیار (مورد تایید سازمان بورس)';
    }
    if (fundamental && fundamental.dividendScore >= 70) {
      return 'سهام با سود تقسیمی بالا - مناسب درآمد ماهانه';
    }
    return 'سهام عادی - معامله در بورس تهران';
  }
  
  /**
   * تعیین نوع دارایی
   */
  private getAssetType(stockData: StockData): string {
    if (stockData.peRatio && stockData.peRatio < 6) {
      return 'سهام بنیادی کم‌ریسک';
    }
    if (stockData.marketCap > 1e12) { // بالای 1000 میلیارد تومان
      return 'سهام بزرگ (Large Cap)';
    }
    return 'سهام معمولی';
  }
  
  /**
   * محاسبه امتیاز تنوع‌بخشی
   */
  private calculateDiversificationScore(items: PortfolioAnalysis['items']): number {
    if (items.length === 0) return 0;
    
    let score = 100;
    
    // جریمه تمرکز زیاد روی یک سهم
    const maxWeight = Math.max(...items.map(i => i.weight));
    if (maxWeight > 0.4) {
      score -= (maxWeight - 0.4) * 100;
    }
    
    // پاداش تعداد سهام مناسب
    if (items.length >= 5) {
      score += 10;
    } else if (items.length < 3) {
      score -= 20;
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * ارزیابی ریسک پرتفو
   */
  private assessPortfolioRisk(
    items: PortfolioAnalysis['items'],
    diversificationScore: number
  ): 'LOW' | 'MODERATE' | 'HIGH' {
    const avgVolatility = items.reduce((sum, item) => sum + Math.abs(item.profitLossPercent), 0) / items.length;
    
    if (diversificationScore >= 70 && avgVolatility < 15) {
      return 'LOW';
    } else if (diversificationScore >= 50 || avgVolatility < 30) {
      return 'MODERATE';
    }
    return 'HIGH';
  }
  
  /**
   * تولید توصیه‌های بهبود پرتفو
   */
  private generatePortfolioRecommendations(
    items: PortfolioAnalysis['items'],
    diversificationScore: number,
    riskLevel: string
  ): string[] {
    const recommendations: string[] = [];
    
    // بررسی تمرکز
    const maxWeightItem = items.reduce((max, item) => 
      item.weight > max.weight ? item : max, { weight: 0 } as any);
    
    if (maxWeightItem.weight > 0.3) {
      recommendations.push(
        `⚠️ تمرکز بیش از حد روی ${maxWeightItem.symbol} (${(maxWeightItem.weight * 100).toFixed(0)}% پرتفو). ` +
        `پیشنهاد: کاهش وزن به حداکثر 25%`
      );
    }
    
    // بررسی تنوع
    if (items.length < 3) {
      recommendations.push('📌 پرتفوی شما کمتر از 3 سهم دارد. برای کاهش ریسک، حداقل 5 سهم از صنایع مختلف اضافه کنید.');
    }
    
    // بررسی سود/ضرر
    const losingItems = items.filter(i => i.profitLossPercent < -20);
    if (losingItems.length > 0) {
      recommendations.push(
        `🔴 ${losingItems.length} سهم با ضرر بیش از 20% دارید. ` +
        `بررسی کنید آیا دلیل بنیادی برای خروج وجود دارد یا خیر.`
      );
    }
    
    // توصیه کلی بر اساس ریسک
    if (riskLevel === 'HIGH') {
      recommendations.push('🛡️ سطح ریسک پرتفوی بالا است. پیشنهاد: افزایش تنوع‌بخشی و کاهش وزن سهام پرریسک.');
    } else if (riskLevel === 'LOW') {
      recommendations.push('✅ پرتفوی متعادل با ریسک کنترل‌شده. ادامه استراتژی فعلی توصیه می‌شود.');
    }
    
    return recommendations;
  }
}

export const signalAndPortfolioService = new SignalAndPortfolioService();
