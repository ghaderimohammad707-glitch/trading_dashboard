import { BacktestEngine } from './engine';
import { OHLCV, BacktestConfig, BacktestReport, Signal } from './types';

export interface WalkForwardConfig {
  trainPeriods: number;    // تعداد دوره‌های آموزش (مثلاً 90 روز)
  testPeriods: number;     // تعداد دوره‌های تست (مثلاً 30 روز)
  stepSize: number;        // اندازه گام برای حرکت به جلو (مثلاً 30 روز)
  minDataPoints: number;   // حداقل داده مورد نیاز
}

export interface WalkForwardResult {
  fold: number;
  trainStart: string;
  trainEnd: string;
  testStart: string;
  testEnd: string;
  trainReport: BacktestReport;
  testReport: BacktestReport;
  oosPerformance: number;  // Out-of-Sample Performance
}

export interface ParameterGrid {
  [key: string]: number[];
}

/**
 * Walk-Forward Optimization
 * 
 * این الگوریتم داده‌ها را به بخش‌های Train و Test تقسیم می‌کند
 * و به صورت rolling forward بهترین پارامترها را پیدا می‌کند.
 * 
 * مزایا:
 * - جلوگیری از Overfitting
 * - شبیه‌سازی شرایط واقعی بازار
 * - اعتبارسنجی استراتژی روی داده‌های ندیده
 */
export class WalkForwardOptimizer {
  private config: BacktestConfig;
  private wfConfig: WalkForwardConfig;
  private data: OHLCV[];
  private signalGenerator: (data: OHLCV[], params: Record<string, number>) => Signal[];

  constructor(
    data: OHLCV[],
    config: BacktestConfig,
    wfConfig: WalkForwardConfig,
    signalGenerator: (data: OHLCV[], params: Record<string, number>) => Signal[]
  ) {
    this.data = data;
    this.config = config;
    this.wfConfig = wfConfig;
    this.signalGenerator = signalGenerator;
  }

  /**
   * اجرای Walk-Forward Optimization
   */
  run(parameterGrid: ParameterGrid): WalkForwardResult[] {
    const results: WalkForwardResult[] = [];
    let currentStart = 0;
    let fold = 1;

    while (currentStart + this.wfConfig.trainPeriods + this.wfConfig.testPeriods <= this.data.length) {
      const trainEnd = currentStart + this.wfConfig.trainPeriods;
      const testEnd = trainEnd + this.wfConfig.testPeriods;

      const trainData = this.data.slice(currentStart, trainEnd);
      const testData = this.data.slice(trainEnd, testEnd);

      if (trainData.length < this.wfConfig.minDataPoints || testData.length < this.wfConfig.minDataPoints) {
        currentStart += this.wfConfig.stepSize;
        continue;
      }

      // بهینه‌سازی پارامترها روی داده‌های Train
      const bestParams = this.optimizeParameters(trainData, parameterGrid);

      // تولید سیگنال با بهترین پارامترها
      const trainSignals = this.signalGenerator(trainData, bestParams);
      const testSignals = this.signalGenerator(testData, bestParams);

      // اجرای بک‌تست روی Train
      const trainEngine = new BacktestEngine({
        ...this.config,
        startDate: new Date(trainData[0].timestamp).toISOString(),
        endDate: new Date(trainData[trainData.length - 1].timestamp).toISOString()
      });

      trainData.forEach((candle, i) => {
        trainEngine['processCandle'](candle, trainSignals[i]);
      });

      const trainReport = trainEngine.generateReport();

      // اجرای بک‌تست روی Test (Out-of-Sample)
      const testEngine = new BacktestEngine({
        ...this.config,
        startDate: new Date(testData[0].timestamp).toISOString(),
        endDate: new Date(testData[testData.length - 1].timestamp).toISOString()
      });

      testData.forEach((candle, i) => {
        testEngine['processCandle'](candle, testSignals[i]);
      });

      const testReport = testEngine.generateReport();

      results.push({
        fold,
        trainStart: new Date(trainData[0].timestamp).toISOString().split('T')[0],
        trainEnd: new Date(trainData[trainData.length - 1].timestamp).toISOString().split('T')[0],
        testStart: new Date(testData[0].timestamp).toISOString().split('T')[0],
        testEnd: new Date(testData[testData.length - 1].timestamp).toISOString().split('T')[0],
        trainReport,
        testReport,
        oosPerformance: testReport.totalReturn
      });

      fold++;
      currentStart += this.wfConfig.stepSize;
    }

    return results;
  }

  /**
   * بهینه‌سازی پارامترها با Grid Search
   */
  private optimizeParameters(data: OHLCV[], grid: ParameterGrid): Record<string, number> {
    const paramNames = Object.keys(grid);
    let bestParams: Record<string, number> = {};
    let bestReturn = -Infinity;

    // تولید تمام ترکیب‌های ممکن
    const combinations = this.generateCombinations(grid);

    for (const params of combinations) {
      const signals = this.signalGenerator(data, params);
      
      const engine = new BacktestEngine({
        ...this.config,
        startDate: new Date(data[0].timestamp).toISOString(),
        endDate: new Date(data[data.length - 1].timestamp).toISOString()
      });

      data.forEach((candle, i) => {
        if (signals[i]) {
          engine['processCandle'](candle, signals[i]);
        }
      });

      const report = engine.generateReport();
      
      if (report.totalReturn > bestReturn) {
        bestReturn = report.totalReturn;
        bestParams = params;
      }
    }

    return bestParams;
  }

  /**
   * تولید تمام ترکیب‌های پارامترها
   */
  private generateCombinations(grid: ParameterGrid): Record<string, number>[] {
    const keys = Object.keys(grid);
    if (keys.length === 0) return [{}];

    const combinations: Record<string, number>[] = [];
    
    const generate = (current: Record<string, number>, index: number) => {
      if (index === keys.length) {
        combinations.push({ ...current });
        return;
      }

      const key = keys[index];
      for (const value of grid[key]) {
        current[key] = value;
        generate(current, index + 1);
      }
    };

    generate({}, 0);
    return combinations;
  }

  /**
   * تحلیل نتایج Walk-Forward
   */
  analyzeResults(results: WalkForwardResult[]): {
    avgOOSPerformance: number;
    stdOOSPerformance: number;
    consistentProfitability: number; // درصد فولدهای سودده
    avgWinRate: number;
    robustnessScore: number; // نسبت عملکرد OOS به IS
  } {
    if (results.length === 0) {
      return {
        avgOOSPerformance: 0,
        stdOOSPerformance: 0,
        consistentProfitability: 0,
        avgWinRate: 0,
        robustnessScore: 0
      };
    }

    const oosReturns = results.map(r => r.oosPerformance);
    const avgOOS = oosReturns.reduce((a, b) => a + b, 0) / oosReturns.length;
    
    const variance = oosReturns.reduce((sum, r) => sum + Math.pow(r - avgOOS, 2), 0) / oosReturns.length;
    const stdOOS = Math.sqrt(variance);

    const profitableFolds = results.filter(r => r.oosPerformance > 0).length;
    const consistentProfitability = profitableFolds / results.length;

    const avgWinRate = results.reduce((sum, r) => sum + r.testReport.winRate, 0) / results.length;

    // Robustness Score: میانگین نسبت عملکرد OOS به IS
    const robustnessScores = results.map(r => {
      const isReturn = r.trainReport.totalReturn;
      if (isReturn === 0) return 0;
      return r.oosPerformance / isReturn;
    });
    const robustnessScore = robustnessScores.reduce((a, b) => a + b, 0) / robustnessScores.length;

    return {
      avgOOSPerformance: avgOOS,
      stdOOSPerformance: stdOOS,
      consistentProfitability,
      avgWinRate,
      robustnessScore
    };
  }
}
