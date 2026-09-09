/**
 * موتور تحلیل بنیادی پیشرفته
 * وظیفه: تحلیل صورت‌های مالی، گزارش‌های ماهانه، داده‌های کدال و ارزیابی ذاتی سهام
 * قانون: فقط داده‌های واقعی از منابع معتبر (کدال، TSETMC) پردازش می‌شوند.
 */

import type { FinancialStatement, MonthlyReport, DividendInfo, StockData } from '@/types/market';

export interface FundamentalScore {
  symbol: string;
  totalScore: number; // 0-100
  financialHealthScore: number; // سلامت مالی
  profitabilityScore: number; // سودآوری
  growthScore: number; // رشد
  valuationScore: number; // ارزش‌گذاری
  dividendScore: number; // سود تقسیمی
  reasons: string[];
  fairValue?: number; // ارزش ذاتی محاسبه شده
  upside?: number; // پتانسیل رشد تا ارزش ذاتی
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
}

export class FundamentalAnalysisEngine {
  
  /**
   * تحلیل سلامت مالی شرکت
   */
  private analyzeFinancialHealth(statements: FinancialStatement[]): number {
    if (statements.length === 0) return 50;
    
    const latest = statements[0];
    let score = 50;
    
    // نسبت بدهی به حقوق صاحبان سهام
    if (latest.debtToEquity < 0.5) {
      score += 15;
    } else if (latest.debtToEquity > 2) {
      score -= 20;
    } else if (latest.debtToEquity > 1) {
      score -= 10;
    }
    
    // نسبت جاری (Current Ratio)
    const currentRatio = latest.currentAssets / latest.currentLiabilities;
    if (currentRatio > 2) {
      score += 10;
    } else if (currentRatio < 1) {
      score -= 15;
    }
    
    // جریان نقد عملیاتی مثبت
    if (latest.cashFlow > 0) {
      score += 10;
    } else {
      score -= 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * تحلیل سودآوری
   */
  private analyzeProfitability(statements: FinancialStatement[]): number {
    if (statements.length === 0) return 50;
    
    const latest = statements[0];
    let score = 50;
    
    // حاشیه سود خالص
    const netProfitMargin = (latest.netProfit / latest.revenue) * 100;
    if (netProfitMargin > 20) {
      score += 20;
    } else if (netProfitMargin > 10) {
      score += 10;
    } else if (netProfitMargin < 0) {
      score -= 20;
    }
    
    // بازده حقوق صاحبان سهام (ROE)
    if (latest.roe > 25) {
      score += 20;
    } else if (latest.roe > 15) {
      score += 10;
    } else if (latest.roe < 5) {
      score -= 15;
    }
    
    // بازده دارایی‌ها (ROA)
    if (latest.roa > 10) {
      score += 15;
    } else if (latest.roa > 5) {
      score += 8;
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * تحلیل رشد
   */
  private analyzeGrowth(statements: FinancialStatement[], monthlyReports: MonthlyReport[]): number {
    if (statements.length < 2 && monthlyReports.length === 0) return 50;
    
    let score = 50;
    
    // رشد درآمد سال به سال
    if (statements.length >= 2) {
      const revenueGrowth = ((statements[0].revenue - statements[1].revenue) / statements[1].revenue) * 100;
      if (revenueGrowth > 30) {
        score += 25;
      } else if (revenueGrowth > 15) {
        score += 15;
      } else if (revenueGrowth > 0) {
        score += 5;
      } else {
        score -= 15;
      }
      
      // رشد سود خالص
      const profitGrowth = ((statements[0].netProfit - statements[1].netProfit) / statements[1].netProfit) * 100;
      if (profitGrowth > 40) {
        score += 25;
      } else if (profitGrowth > 20) {
        score += 15;
      } else if (profitGrowth > 0) {
        score += 5;
      } else {
        score -= 15;
      }
    }
    
    // بررسی گزارش‌های ماهانه برای رشد فروش
    if (monthlyReports.length >= 3) {
      const recentSales = monthlyReports.slice(0, 3).map(r => r.salesVolume);
      const avgRecentSales = recentSales.reduce((a, b) => a + b, 0) / 3;
      const olderSales = monthlyReports.slice(3, 6).map(r => r.salesVolume);
      if (olderSales.length > 0) {
        const avgOlderSales = olderSales.reduce((a, b) => a + b, 0) / olderSales.length;
        const salesGrowth = ((avgRecentSales - avgOlderSales) / avgOlderSales) * 100;
        
        if (salesGrowth > 20) score += 15;
        else if (salesGrowth > 0) score += 8;
        else score -= 10;
      }
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * تحلیل ارزش‌گذاری (Valuation)
   */
  private analyzeValuation(stockData: StockData, statements: FinancialStatement[]): number {
    if (!stockData.peRatio || statements.length === 0) return 50;
    
    let score = 50;
    const pe = stockData.peRatio;
    const industryAvgPE = 12; // میانگین صنعت (قابل تنظیم)
    
    // مقایسه P/E با میانگین صنعت
    if (pe < industryAvgPE * 0.7) {
      score += 25; // بسیار ارزان
    } else if (pe < industryAvgPE) {
      score += 15; // ارزان
    } else if (pe > industryAvgPE * 2) {
      score -= 20; // بسیار گران
    } else if (pe > industryAvgPE * 1.5) {
      score -= 10; // گران
    }
    
    // محاسبه PEG Ratio (برای شرکت‌های در حال رشد)
    if (statements.length >= 2) {
      const earningsGrowth = ((statements[0].eps - statements[1].eps) / statements[1].eps) * 100;
      if (earningsGrowth > 0) {
        const peg = pe / earningsGrowth;
        if (peg < 1) {
          score += 15; // رشد خوب با قیمت مناسب
        } else if (peg > 2) {
          score -= 10;
        }
      }
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * تحلیل سود تقسیمی
   */
  private analyzeDividends(dividends: DividendInfo[]): number {
    if (dividends.length === 0) return 30; // نمره پایه برای عدم پرداخت
    
    let score = 50;
    const latest = dividends[0];
    
    // درصد پرداخت سود
    if (latest.payoutRatio > 70) {
      score += 20;
    } else if (latest.payoutRatio > 40) {
      score += 10;
    }
    
    // بازده سود تقسیمی
    if (latest.dividendYield > 8) {
      score += 20;
    } else if (latest.dividendYield > 5) {
      score += 10;
    } else if (latest.dividendYield < 2) {
      score -= 10;
    }
    
    // ثبات در پرداخت سود
    if (dividends.length >= 3) {
      const allPaid = dividends.every(d => d.dpsApproved > 0);
      if (allPaid) {
        score += 15;
      }
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * محاسبه ارزش ذاتی با مدل تنزیل جریان نقد (DCF Simplified)
   */
  private calculateFairValue(statements: FinancialStatement[], stockData: StockData): number | undefined {
    if (statements.length === 0 || !statements[0].cashFlow) return undefined;
    
    const latestCashFlow = statements[0].cashFlow;
    const sharesOutstanding = stockData.marketCap / stockData.currentPrice;
    
    if (sharesOutstanding <= 0) return undefined;
    
    const cashFlowPerShare = latestCashFlow / sharesOutstanding;
    const growthRate = 0.15; // فرض رشد 15% (قابل بهبود با تحلیل دقیق‌تر)
    const discountRate = 0.25; // نرخ تنزیل 25% برای ریسک بازار ایران
    const terminalMultiple = 8;
    
    // محاسبه ارزش Present Value برای 5 سال آینده
    let presentValue = 0;
    for (let i = 1; i <= 5; i++) {
      const futureCF = cashFlowPerShare * Math.pow(1 + growthRate, i);
      presentValue += futureCF / Math.pow(1 + discountRate, i);
    }
    
    // ارزش پایانی (Terminal Value)
    const terminalValue = (cashFlowPerShare * Math.pow(1 + growthRate, 5) * terminalMultiple) / 
                         Math.pow(1 + discountRate, 5);
    
    return presentValue + terminalValue;
  }
  
  /**
   * تحلیل جامع بنیادی یک نماد
   */
  async analyzeSymbol(
    symbol: string,
    stockData: StockData,
    statements: FinancialStatement[],
    monthlyReports: MonthlyReport[],
    dividends: DividendInfo[]
  ): Promise<FundamentalScore> {
    const reasons: string[] = [];
    
    // محاسبه امتیازات جزئی
    const financialHealthScore = this.analyzeFinancialHealth(statements);
    const profitabilityScore = this.analyzeProfitability(statements);
    const growthScore = this.analyzeGrowth(statements, monthlyReports);
    const valuationScore = this.analyzeValuation(stockData, statements);
    const dividendScore = this.analyzeDividends(dividends);
    
    // محاسبه امتیاز کل با وزن‌دهی
    const totalScore = 
      (financialHealthScore * 0.25) +
      (profitabilityScore * 0.25) +
      (growthScore * 0.20) +
      (valuationScore * 0.20) +
      (dividendScore * 0.10);
    
    // تولید دلایل شفاف
    if (financialHealthScore >= 70) {
      reasons.push(`سلامت مالی عالی (امتیاز: ${financialHealthScore}) - بدهی کنترل‌شده و جریان نقد مثبت`);
    } else if (financialHealthScore <= 40) {
      reasons.push(`ریسک مالی بالا (امتیاز: ${financialHealthScore}) - نسبت بدهی نامناسب`);
    }
    
    if (profitabilityScore >= 70) {
      reasons.push(`سودآوری قوی (امتیاز: ${profitabilityScore}) - حاشیه سود و ROE مطلوب`);
    }
    
    if (growthScore >= 70) {
      reasons.push(`رشد قابل توجه درآمد و سود (امتیاز: ${growthScore})`);
    } else if (growthScore <= 40) {
      reasons.push(`رضعیت رشد ضعیف (امتیاز: ${growthScore}) - کاهش فروش یا سود`);
    }
    
    if (valuationScore >= 70) {
      reasons.push(`ارزش‌گذاری جذاب (امتیاز: ${valuationScore}) - قیمت ниже ارزش ذاتی`);
    } else if (valuationScore <= 40) {
      reasons.push(`قیمت بالاتر از ارزش منصفانه (امتیاز: ${valuationScore})`);
    }
    
    // محاسبه ارزش ذاتی و پتانسیل رشد
    const fairValue = this.calculateFairValue(statements, stockData);
    let upside: number | undefined;
    
    if (fairValue) {
      upside = ((fairValue - stockData.currentPrice) / stockData.currentPrice) * 100;
      reasons.push(`ارزش ذاتی تخمینی: ${Math.round(fairValue).toLocaleString()} ریال`);
      reasons.push(`پتانسیل رشد تا ارزش ذاتی: ${upside.toFixed(1)}%`);
    }
    
    // تعیین توصیه نهایی
    let recommendation: FundamentalScore['recommendation'] = 'HOLD';
    
    if (totalScore >= 80 && upside && upside > 20) {
      recommendation = 'STRONG_BUY';
    } else if (totalScore >= 65 && upside && upside > 10) {
      recommendation = 'BUY';
    } else if (totalScore <= 35 || (upside && upside < -20)) {
      recommendation = 'SELL';
    } else if (totalScore <= 25) {
      recommendation = 'STRONG_SELL';
    }
    
    return {
      symbol,
      totalScore: Math.round(totalScore),
      financialHealthScore: Math.round(financialHealthScore),
      profitabilityScore: Math.round(profitabilityScore),
      growthScore: Math.round(growthScore),
      valuationScore: Math.round(valuationScore),
      dividendScore: Math.round(dividendScore),
      reasons,
      fairValue: fairValue ? Math.round(fairValue) : undefined,
      upside: upside ? Math.round(upside * 10) / 10 : undefined,
      recommendation
    };
  }
}

export const fundamentalEngine = new FundamentalAnalysisEngine();
