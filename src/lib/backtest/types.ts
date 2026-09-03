import { format } from 'date-fns';

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Signal {
  timestamp: number;
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';
  confidence: number;
  targetPrice?: number;
  stopLoss?: number;
}

export interface BacktestConfig {
  initialCapital: number;
  commissionRate: number; // e.g., 0.0008 (0.08%)
  slippageRate: number;   // e.g., 0.001 (0.1%)
  startDate: string;
  endDate: string;
  symbol: string;
}

export interface TradeResult {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  side: 'LONG' | 'SHORT';
  profit: number;
  profitPercent: number;
  fees: number;
  slippage: number;
  exitReason: 'TARGET' | 'STOP' | 'SIGNAL_REVERSAL' | 'TIMEOUT';
}

export interface BacktestReport {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  profitFactor: number;
  trades: TradeResult[];
  equityCurve: { date: string; value: number }[];
}

/**
 * Generates realistic historical data for backtesting when API is limited.
 * Uses Geometric Brownian Motion with volatility clustering to mimic real market.
 */
export function generateHistoricalData(
  startDate: string,
  endDate: string,
  initialPrice: number,
  volatility: number = 0.02,
  drift: number = 0.0005
): OHLCV[] {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const data: OHLCV[] = [];
  
  let currentPrice = initialPrice;
  let currentTime = start;
  
  // Volatility clustering state
  let currentVolatility = volatility;

  while (currentTime <= end) {
    // Skip weekends (simple check)
    const day = new Date(currentTime).getDay();
    if (day !== 0 && day !== 6) {
      // Update volatility (mean reverting)
      currentVolatility = 0.9 * currentVolatility + 0.1 * volatility * (0.5 + Math.random());
      
      const dailyReturn = drift + currentVolatility * (Math.random() - 0.5) * 2;
      const open = currentPrice;
      const close = open * (1 + dailyReturn);
      
      // Generate High/Low based on range
      const range = Math.abs(open - close) * (1 + Math.random() * 0.5);
      const high = Math.max(open, close) + range * Math.random();
      const low = Math.min(open, close) - range * Math.random();
      
      // Volume correlates with volatility
      const baseVolume = 1000000;
      const volume = Math.floor(baseVolume * (1 + Math.abs(dailyReturn) * 10) * (0.8 + Math.random() * 0.4));

      data.push({
        timestamp: currentTime,
        open,
        high,
        low,
        close,
        volume
      });

      currentPrice = close;
    }
    
    // Add 1 day (in ms)
    currentTime += 24 * 60 * 60 * 1000;
  }

  return data;
}

/**
 * Calculates fees and slippage for a trade
 */
export function calculateTransactionCosts(
  price: number,
  quantity: number,
  config: BacktestConfig,
  isEntry: boolean
): { cost: number; slippage: number; effectivePrice: number } {
  const baseCost = price * quantity;
  const commission = baseCost * config.commissionRate;
  
  // Slippage simulation: worse price for entry, better/worse for exit depending on side
  // Simplified: always assume negative slippage for conservative backtesting
  const slippageAmount = baseCost * config.slippageRate;
  
  const totalCost = commission + slippageAmount;
  const effectivePrice = isEntry 
    ? price * (1 + config.slippageRate) 
    : price * (1 - config.slippageRate);

  return {
    cost: totalCost,
    slippage: slippageAmount,
    effectivePrice
  };
}
