/**
 * ماژول یادگیری عمیق برای پیش‌بینی قیمت
 * استفاده از مدل‌های LSTM و Transformer
 */

export interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PredictionResult {
  symbol: string;
  predictedPrices: number[];
  confidence: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  targetPrice: number;
  stopLoss: number;
  timeHorizon: number; // تعداد روزهای پیش‌بینی
}

export interface ModelConfig {
  sequenceLength: number;      // طول دنباله ورودی
  predictionHorizon: number;   // تعداد روزهای پیش‌بینی
  lstmUnits: number[];         // تعداد واحدهای هر لایه LSTM
  dropoutRate: number;         // نرخ Dropout
  learningRate: number;        // نرخ یادگیری
  epochs: number;              // تعداد دوره‌های آموزش
  batchSize: number;           // اندازه دسته آموزش
}

/**
 * آماده‌سازی داده‌ها برای مدل LSTM
 * ایجاد دنباله‌های زمانی از داده‌های OHLCV
 */
export function prepareSequences(
  data: OHLCVData[],
  sequenceLength: number,
  predictionHorizon: number = 1
): { features: number[][]; targets: number[] } {
  const features: number[][] = [];
  const targets: number[] = [];
  
  if (data.length < sequenceLength + predictionHorizon) {
    return { features: [], targets: [] };
  }
  
  for (let i = sequenceLength; i < data.length - predictionHorizon; i++) {
    // استخراج ویژگی‌ها: [Open, High, Low, Close, Volume]
    const sequence: number[] = [];
    
    for (let j = i - sequenceLength; j < i; j++) {
      sequence.push(
        data[j].open,
        data[j].high,
        data[j].low,
        data[j].close,
        data[j].volume
      );
    }
    
    features.push(sequence);
    
    // هدف: میانگین قیمت closing در horizon پیش‌بینی
    let sumClose = 0;
    for (let k = 1; k <= predictionHorizon; k++) {
      sumClose += data[i + k].close;
    }
    targets.push(sumClose / predictionHorizon);
  }
  
  return { features, targets };
}

/**
 * نرمال‌سازی داده‌ها با Min-Max Scaling
 */
export function normalizeData(data: number[]): { normalized: number[]; min: number; max: number } {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  
  if (range === 0) {
    return { normalized: data.map(() => 0.5), min, max };
  }
  
  const normalized = data.map(value => (value - min) / range);
  
  return { normalized, min, max };
}

/**
 * غیرنرمال‌سازی داده‌ها (Inverse Transform)
 */
export function denormalizeData(normalized: number[], min: number, max: number): number[] {
  const range = max - min;
  return normalized.map(value => value * range + min);
}

/**
 * محاسبه ویژگی‌های تکنیکال برای ورودی مدل
 */
export function calculateTechnicalFeatures(data: OHLCVData[]): number[][] {
  const features: number[][] = [];
  
  for (let i = 0; i < data.length; i++) {
    const candle = data[i];
    const featureVector: number[] = [];
    
    // قیمت‌های اصلی
    featureVector.push(candle.open);
    featureVector.push(candle.high);
    featureVector.push(candle.low);
    featureVector.push(candle.close);
    featureVector.push(candle.volume);
    
    // بازده روزانه
    if (i > 0) {
      const dailyReturn = (candle.close - data[i - 1].close) / data[i - 1].close;
      featureVector.push(dailyReturn);
    } else {
      featureVector.push(0);
    }
    
    // محدوده قیمتی (High - Low)
    const range = (candle.high - candle.low) / candle.close;
    featureVector.push(range);
    
    // موقعیت قیمت بسته‌شدن در محدوده
    const closePosition = candle.high !== candle.low
      ? (candle.close - candle.low) / (candle.high - candle.low)
      : 0.5;
    featureVector.push(closePosition);
    
    // میانگین متحرک ساده ۵ روزه (در صورت وجود داده کافی)
    if (i >= 5) {
      let sum = 0;
      for (let j = 0; j < 5; j++) {
        sum += data[i - j].close;
      }
      const sma5 = sum / 5;
      featureVector.push(sma5 / candle.close); // نسبت به قیمت فعلی
    } else {
      featureVector.push(1);
    }
    
    // میانگین متحرک ساده ۲۰ روزه
    if (i >= 20) {
      let sum = 0;
      for (let j = 0; j < 20; j++) {
        sum += data[i - j].close;
      }
      const sma20 = sum / 20;
      featureVector.push(sma20 / candle.close);
    } else {
      featureVector.push(1);
    }
    
    features.push(featureVector);
  }
  
  return features;
}

/**
 * شبیه‌سازی پیش‌بینی LSTM (بدون وابستگی به TensorFlow.js)
 * در محیط واقعی، این تابع باید با مدل آموزش‌دیده جایگزین شود
 */
export function predictWithLSTM(
  symbol: string,
  data: OHLCVData[],
  config: ModelConfig
): PredictionResult {
  // آماده‌سازی داده‌ها
  const sequences = prepareSequences(data, config.sequenceLength, config.predictionHorizon);
  
  if (sequences.features.length === 0) {
    return {
      symbol,
      predictedPrices: [],
      confidence: 0,
      trend: 'neutral',
      targetPrice: data[data.length - 1].close,
      stopLoss: data[data.length - 1].close * 0.95,
      timeHorizon: config.predictionHorizon
    };
  }
  
  // استفاده از آخرین دنباله برای پیش‌بینی
  const lastSequence = sequences.features[sequences.features.length - 1];
  const recentPrices = data.slice(-config.sequenceLength).map(d => d.close);
  
  // شبیه‌سازی پیش‌بینی (در واقعیت باید از مدل LSTM استفاده شود)
  const predictedChanges: number[] = [];
  
  for (let i = 0; i < config.predictionHorizon; i++) {
    // شبیه‌سازی تغییرات قیمت بر اساس الگوهای اخیر
    const avgChange = recentPrices.reduce((sum, price, idx) => {
      if (idx === 0) return sum;
      return sum + (price - recentPrices[idx - 1]) / recentPrices[idx - 1];
    }, 0) / (recentPrices.length - 1);
    
    // اضافه کردن نویز تصادفی برای واقع‌گرایی
    const noise = (Math.random() - 0.5) * 0.02;
    predictedChanges.push(avgChange + noise);
  }
  
  // تولید قیمت‌های پیش‌بینی‌شده
  const predictedPrices: number[] = [];
  let lastPrice = data[data.length - 1].close;
  
  for (const change of predictedChanges) {
    lastPrice = lastPrice * (1 + change);
    predictedPrices.push(lastPrice);
  }
  
  // تعیین روند
  const firstPredicted = predictedPrices[0];
  const lastPredicted = predictedPrices[predictedPrices.length - 1];
  const overallChange = (lastPredicted - firstPredicted) / firstPredicted;
  
  let trend: 'bullish' | 'bearish' | 'neutral';
  if (overallChange > 0.02) {
    trend = 'bullish';
  } else if (overallChange < -0.02) {
    trend = 'bearish';
  } else {
    trend = 'neutral';
  }
  
  // محاسبه هدف و حد ضرر
  const targetPrice = Math.max(...predictedPrices);
  const stopLoss = Math.min(...predictedPrices) * 0.98;
  
  // امتیاز اطمینان (بر اساس نوسان پیش‌بینی‌ها)
  const volatility = predictedPrices.reduce((sum, price, idx, arr) => {
    if (idx === 0) return sum;
    const change = Math.abs(price - arr[idx - 1]) / arr[idx - 1];
    return sum + change;
  }, 0) / predictedPrices.length;
  
  const confidence = Math.max(0, Math.min(100, (1 - volatility * 10) * 100));
  
  return {
    symbol,
    predictedPrices,
    confidence: parseFloat(confidence.toFixed(2)),
    trend,
    targetPrice: parseFloat(targetPrice.toFixed(2)),
    stopLoss: parseFloat(stopLoss.toFixed(2)),
    timeHorizon: config.predictionHorizon
  };
}

/**
 * تشخیص الگوی کندلی با استفاده از قوانین کلاسیک
 * (جایگزین ساده برای بینایی ماشین در محیط JavaScript)
 */
export function detectCandlestickPattern(data: OHLCVData[]): string[] {
  const patterns: string[] = [];
  
  if (data.length < 3) return patterns;
  
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const prev2 = data[data.length - 3];
  
  // محاسبه بدنه و سایه‌ها
  const lastBodySize = Math.abs(last.close - last.open);
  const prevBodySize = Math.abs(prev.close - prev.open);
  const prev2BodySize = Math.abs(prev2.close - prev2.open);
  const upperShadow = last.high - Math.max(last.close, last.open);
  const lowerShadow = Math.min(last.close, last.open) - last.low;
  const totalRange = last.high - last.low;
  
  // دوجی (Doji)
  if (lastBodySize < totalRange * 0.1) {
    patterns.push('Doji');
  }
  
  // چکش (Hammer)
  if (lowerShadow > lastBodySize * 2 && upperShadow < lastBodySize * 0.5) {
    patterns.push('Hammer');
  }
  
  // مرد دارآویز (Hanging Man)
  if (lowerShadow > lastBodySize * 2 && upperShadow < lastBodySize * 0.5 && last.close < last.open) {
    patterns.push('Hanging Man');
  }
  
  // پوشای صعودی (Bullish Engulfing)
  if (prev.close < prev.open && // کندل قبلی نزولی
      last.close > last.open && // کندل فعلی صعودی
      last.open < prev.close && // شروع پایین‌تر
      last.close > prev.open) { // پایان بالاتر
    patterns.push('Bullish Engulfing');
  }
  
  // پوشای نزولی (Bearish Engulfing)
  if (prev.close > prev.open && // کندل قبلی صعودی
      last.close < last.open && // کندل فعلی نزولی
      last.open > prev.close && // شروع بالاتر
      last.close < prev.open) { // پایان پایین‌تر
    patterns.push('Bearish Engulfing');
  }
  
  // ستاره صبحگاهی (Morning Star)
  if (prev2.close < prev2.open && // سه کندل قبل نزولی
      prevBodySize < prev2BodySize * 0.5 && // کندل میانی کوچک
      last.close > last.open && // کندل فعلی صعودی
      last.close > (prev2.open + prev2.close) / 2) { // بسته شدن در نیمه بالایی کندل اول
    patterns.push('Morning Star');
  }
  
  // ستاره عصرگاهی (Evening Star)
  if (prev2.close > prev2.open && // سه کندل قبل صعودی
      prevBodySize < prev2BodySize * 0.5 && // کندل میانی کوچک
      last.close < last.open && // کندل فعلی نزولی
      last.close < (prev2.open + prev2.close) / 2) { // بسته شدن در نیمه پایینی کندل اول
    patterns.push('Evening Star');
  }
  
  return patterns;
}

/**
 * ترکیب پیش‌بینی LSTM با الگوهای کندلی
 */
export function getEnhancedPrediction(
  symbol: string,
  data: OHLCVData[],
  config: ModelConfig
): PredictionResult & { patterns: string[] } {
  const lstmPrediction = predictWithLSTM(symbol, data, config);
  const patterns = detectCandlestickPattern(data);
  
  // تنظیم اطمینان بر اساس الگوهای شناسایی‌شده
  let adjustedConfidence = lstmPrediction.confidence;
  
  if (patterns.includes('Bullish Engulfing') || patterns.includes('Morning Star')) {
    if (lstmPrediction.trend === 'bullish') {
      adjustedConfidence = Math.min(100, adjustedConfidence + 15);
    }
  }
  
  if (patterns.includes('Bearish Engulfing') || patterns.includes('Evening Star')) {
    if (lstmPrediction.trend === 'bearish') {
      adjustedConfidence = Math.min(100, adjustedConfidence + 15);
    }
  }
  
  if (patterns.includes('Doji')) {
    adjustedConfidence = Math.max(0, adjustedConfidence - 10); // عدم قطعیت بیشتر
  }
  
  return {
    ...lstmPrediction,
    confidence: parseFloat(adjustedConfidence.toFixed(2)),
    patterns
  };
}

/**
 * پیکربندی پیش‌فرض مدل LSTM
 */
export const DEFAULT_LSTM_CONFIG: ModelConfig = {
  sequenceLength: 20,
  predictionHorizon: 5,
  lstmUnits: [50, 30],
  dropoutRate: 0.2,
  learningRate: 0.001,
  epochs: 100,
  batchSize: 32
};
