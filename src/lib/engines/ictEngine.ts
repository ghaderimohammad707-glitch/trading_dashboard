/**
 * ICT (Inner Circle Trader) Pattern Engine
 * Identifies Fair Value Gaps (FVG), Order Blocks, and Break of Structure (BOS)
 */

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface FVG {
  type: 'bullish' | 'bearish';
  startPrice: number;
  endPrice: number;
  startTime: number;
  endTime: number;
  confidence: number;
}

interface OrderBlock {
  type: 'bullish' | 'bearish';
  priceStart: number;
  priceEnd: number;
  time: number;
  confidence: number;
}

interface BOS {
  type: 'breakout' | 'breakdown';
  brokenLevel: number;
  breakoutPrice: number;
  time: number;
  strength: number;
}

interface ICTPatterns {
  fvg: FVG[];
  orderBlocks: OrderBlock[];
  bos: BOS[];
}

export class ICTEngine {
  /**
   * Detect Fair Value Gaps (FVG)
   * A FVG occurs when there's a gap between the wick of candle 1 and candle 3
   */
  detectFVG(candles: Candle[]): FVG[] {
    const fvgList: FVG[] = [];

    if (candles.length < 3) return fvgList;

    for (let i = 1; i < candles.length - 1; i++) {
      const prev = candles[i - 1];
      const current = candles[i];
      const next = candles[i + 1];

      // Bullish FVG: Low of candle 3 > High of candle 1
      if (next.low > prev.high && current.close > current.open) {
        const gapStart = prev.high;
        const gapEnd = next.low;
        const gapSize = gapEnd - gapStart;
        const avgRange = (prev.high - prev.low + current.high - current.low + next.high - next.low) / 3;
        
        // Only consider significant gaps (> 20% of average range)
        if (gapSize > avgRange * 0.2) {
          fvgList.push({
            type: 'bullish',
            startPrice: gapStart,
            endPrice: gapEnd,
            startTime: prev.time,
            endTime: next.time,
            confidence: Math.min(100, Math.round((gapSize / avgRange) * 50)),
          });
        }
      }

      // Bearish FVG: High of candle 3 < Low of candle 1
      if (next.high < prev.low && current.close < current.open) {
        const gapStart = next.high;
        const gapEnd = prev.low;
        const gapSize = gapEnd - gapStart;
        const avgRange = (prev.high - prev.low + current.high - current.low + next.high - next.low) / 3;
        
        if (gapSize > avgRange * 0.2) {
          fvgList.push({
            type: 'bearish',
            startPrice: gapStart,
            endPrice: gapEnd,
            startTime: prev.time,
            endTime: next.time,
            confidence: Math.min(100, Math.round((gapSize / avgRange) * 50)),
          });
        }
      }
    }

    return fvgList;
  }

  /**
   * Detect Order Blocks
   * Bullish OB: Last down candle before a strong up move
   * Bearish OB: Last up candle before a strong down move
   */
  detectOrderBlocks(candles: Candle[], lookback: number = 5): OrderBlock[] {
    const blocks: OrderBlock[] = [];

    if (candles.length < lookback + 2) return blocks;

    for (let i = lookback; i < candles.length - 1; i++) {
      const current = candles[i];
      const previous = candles[i - 1];

      // Check for bullish order block (last red candle before strong green)
      if (previous.close < previous.open && current.close > current.open) {
        const moveStrength = current.close - current.open;
        const avgMove = candles.slice(i - lookback, i).reduce((sum, c) => sum + Math.abs(c.close - c.open), 0) / lookback;

        if (moveStrength > avgMove * 1.5) {
          blocks.push({
            type: 'bullish',
            priceStart: previous.low,
            priceEnd: previous.high,
            time: previous.time,
            confidence: Math.min(100, Math.round((moveStrength / avgMove) * 40)),
          });
        }
      }

      // Check for bearish order block (last green candle before strong red)
      if (previous.close > previous.open && current.close < current.open) {
        const moveStrength = previous.close - previous.open;
        const avgMove = candles.slice(i - lookback, i).reduce((sum, c) => sum + Math.abs(c.close - c.open), 0) / lookback;

        if (Math.abs(current.close - current.open) > avgMove * 1.5) {
          blocks.push({
            type: 'bearish',
            priceStart: previous.low,
            priceEnd: previous.high,
            time: previous.time,
            confidence: Math.min(100, Math.round((Math.abs(current.close - current.open) / avgMove) * 40)),
          });
        }
      }
    }

    return blocks;
  }

  /**
   * Detect Break of Structure (BOS)
   * Identifies when price breaks above resistance or below support
   */
  detectBOS(candles: Candle[], period: number = 20): BOS[] {
    const bosList: BOS[] = [];

    if (candles.length < period + 1) return bosList;

    for (let i = period; i < candles.length; i++) {
      const current = candles[i];
      const recentCandles = candles.slice(i - period, i);

      const highestHigh = Math.max(...recentCandles.map(c => c.high));
      const lowestLow = Math.min(...recentCandles.map(c => c.low));

      // Breakout above resistance
      if (current.close > highestHigh) {
        const breakoutStrength = (current.close - highestHigh) / highestHigh * 100;
        const volumeConfirm = true; // Could add volume confirmation here

        bosList.push({
          type: 'breakout',
          brokenLevel: highestHigh,
          breakoutPrice: current.close,
          time: current.time,
          strength: Math.min(100, Math.round(breakoutStrength * 1000)),
        });
      }

      // Breakdown below support
      if (current.close < lowestLow) {
        const breakdownStrength = (lowestLow - current.close) / lowestLow * 100;
        
        bosList.push({
          type: 'breakdown',
          brokenLevel: lowestLow,
          breakoutPrice: current.close,
          time: current.time,
          strength: Math.min(100, Math.round(breakdownStrength * 1000)),
        });
      }
    }

    return bosList;
  }

  /**
   * Analyze all ICT patterns in one call
   */
  analyze(candles: Candle[]): ICTPatterns {
    return {
      fvg: this.detectFVG(candles),
      orderBlocks: this.detectOrderBlocks(candles),
      bos: this.detectBOS(candles),
    };
  }
}

export const ictEngine = new ICTEngine();
