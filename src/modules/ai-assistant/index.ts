/**
 * AI Trading Assistant Module - ماژول دستیار هوشمند ترید
 * 
 * This module provides AI-powered trading assistance features:
 * - Market analysis and sentiment detection
 * - Portfolio suggestions based on risk tolerance
 * - Chat-based interface for querying market data
 * - Real-time signal interpretation
 * 
 * Architecture:
 * - Uses modular design for easy integration with any backend
 * - Supports multiple AI providers (OpenAI, local models, etc.)
 * - Works with cached data for offline functionality
 * - Ready for WebSocket integration for real-time updates
 * 
 * Future Integration Points:
 * - Replace processUserQuery with actual AI API calls
 * - Add conversation history persistence
 * - Integrate with backend for personalized recommendations
 */

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  relatedSymbol?: string;
  metadata?: {
    confidence?: number;
    sources?: string[];
    actionType?: "analysis" | "suggestion" | "warning" | "info";
  };
}

export interface PortfolioSuggestion {
  symbol: string;
  allocation: number; // Percentage of total portfolio
  reason: string;
  riskLevel: "low" | "medium" | "high";
  expectedReturn: number;
  stopLoss: number;
  takeProfit: number;
  timeHorizon?: "short" | "medium" | "long";
}

export interface MarketAnalysis {
  overallSentiment: "bullish" | "bearish" | "neutral";
  confidence: number;
  keyFactors: string[];
  recommendedAction: "buy" | "sell" | "hold" | "wait";
  riskWarning?: string;
  technicalScore?: number;
  fundamentalScore?: number;
  sentimentScore?: number;
}

export interface NewsSentiment {
  title: string;
  sentiment: "positive" | "negative" | "neutral";
  score: number; // -1 to +1
  impact: "low" | "medium" | "high";
  relatedSymbols: string[];
  publishedAt: Date;
}

export interface AIAssistantConfig {
  /** AI provider endpoint (for future integration) */
  apiEndpoint?: string;
  /** API key for external AI services */
  apiKey?: string;
  /** Enable real-time market data analysis */
  enableRealTimeAnalysis: boolean;
  /** Risk tolerance level for suggestions */
  defaultRiskTolerance: "low" | "medium" | "high";
  /** Maximum number of chat messages to keep in memory */
  maxChatHistory: number;
  /** Enable portfolio suggestions */
  enablePortfolioSuggestions: boolean;
  /** Language preference */
  language: "fa" | "en";
}

/**
 * Default configuration for the AI assistant
 */
export const DEFAULT_CONFIG: AIAssistantConfig = {
  enableRealTimeAnalysis: true,
  defaultRiskTolerance: "medium",
  maxChatHistory: 50,
  enablePortfolioSuggestions: true,
  language: "fa",
};

/**
 * Generate a welcome message from the AI assistant
 */
export function getWelcomeMessage(config: AIAssistantConfig = DEFAULT_CONFIG): ChatMessage {
  const isPersian = config.language === "fa";
  
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: isPersian 
      ? "سلام! من دستیار هوشمند ترید شما هستم. 🤖\n\nمی‌تونم در موارد زیر کمکتون کنم:\n• تحلیل وضعیت بازار\n• پیشنهاد سبد سهام\n• بررسی سیگنال‌ها\n• تحلیل اخبار و احساسات\n• مدیریت ریسک\n\nچه کمکی از دستم برمیاد؟"
      : "Hello! I'm your AI Trading Assistant. 🤖\n\nI can help you with:\n• Market analysis\n• Portfolio suggestions\n• Signal review\n• News and sentiment analysis\n• Risk management\n\nHow can I assist you today?",
    timestamp: new Date(),
    metadata: {
      actionType: "info",
    },
  };
}

/**
 * Process user query and generate appropriate response
 * This is a rule-based implementation that can be replaced with AI API calls
 */
export function processUserQuery(
  query: string,
  marketData: any[],
  signals: any[],
  config: AIAssistantConfig = DEFAULT_CONFIG
): ChatMessage {
  const lowerQuery = query.toLowerCase();
  const isPersian = config.language === "fa";
  
  // Detect query intent
  if (lowerQuery.includes(isPersian ? "بازار" : "market") || 
      lowerQuery.includes(isPersian ? "وضعیت" : "status")) {
    return analyzeMarket(marketData, signals, config);
  }
  
  if (lowerQuery.includes(isPersian ? "پیشنهاد" : "suggest") || 
      lowerQuery.includes(isPersian ? "سبد" : "portfolio") ||
      lowerQuery.includes(isPersian ? "پرتفوی" : "portfolio")) {
    return suggestPortfolio(marketData, signals, config);
  }
  
  if (lowerQuery.includes(isPersian ? "سیگنال" : "signal")) {
    return analyzeSignals(signals, config);
  }
  
  if (lowerQuery.includes(isPersian ? "ریسک" : "risk") || 
      lowerQuery.includes(isPersian ? "خطر" : "danger")) {
    return explainRisk(config);
  }
  
  if (lowerQuery.includes(isPersian ? "خبر" : "news") || 
      lowerQuery.includes(isPersian ? "اخبار" : "news")) {
    return analyzeNewsSentiment(config);
  }
  
  // Default response
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: isPersian
      ? "متوجه شدم. برای تحلیل دقیق‌تر، لطفاً مشخص کنید:\n• کدام نماد یا صنعت مد نظرتون هست؟\n• چه نوع تحلیلی نیاز دارید؟ (تکنیکال، فاندامنتال، تابلوخوانی)\n• افق زمانی سرمایه‌گذاری شما چقدر است؟"
      : "Understood. For a more accurate analysis, please specify:\n• Which symbol or sector are you interested in?\n• What type of analysis do you need? (technical, fundamental, order flow)\n• What is your investment time horizon?",
    timestamp: new Date(),
    metadata: {
      actionType: "info",
    },
  };
}

/**
 * Analyze overall market conditions
 */
function analyzeMarket(
  instruments: any[],
  signals: any[],
  config: AIAssistantConfig
): ChatMessage {
  const isPersian = config.language === "fa";
  
  if (instruments.length === 0) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      content: isPersian
        ? "⚠️ داده‌ای برای تحلیل بازار موجود نیست. لطفاً ابتدا داده‌ها را بروزرسانی کنید."
        : "⚠️ No market data available. Please refresh the data first.",
      timestamp: new Date(),
      metadata: { actionType: "warning" },
    };
  }

  const upCount = instruments.filter((i) => i.changePercent > 0).length;
  const downCount = instruments.filter((i) => i.changePercent < 0).length;
  const total = instruments.length;
  const upRatio = (upCount / total) * 100;

  let sentiment: "bullish" | "bearish" | "neutral";
  let message = "";

  if (upRatio > 60) {
    sentiment = "bullish";
    message = isPersian ? "📈 بازار مثبت است!\n\n" : "📈 Market is bullish!\n\n";
    message += isPersian
      ? `• ${upCount} نماد صعودی (${upRatio.toFixed(1)}٪)\n`
      : `• ${upCount} symbols advancing (${upRatio.toFixed(1)}%)\n`;
    message += isPersian
      ? `• ${downCount} نماد نزولی\n`
      : `• ${downCount} symbols declining\n`;
    message += isPersian
      ? "\n💡 پیشنهاد: فرصت‌های خرید مناسب وجود دارد."
      : "\n💡 Suggestion: Good buying opportunities exist.";
  } else if (upRatio < 40) {
    sentiment = "bearish";
    message = isPersian ? "📉 بازار منفی است!\n\n" : "📉 Market is bearish!\n\n";
    message += isPersian
      ? `• ${upCount} نماد صعودی (${upRatio.toFixed(1)}٪)\n`
      : `• ${upCount} symbols advancing (${upRatio.toFixed(1)}%)\n`;
    message += isPersian
      ? `• ${downCount} نماد نزولی\n`
      : `• ${downCount} symbols declining\n`;
    message += isPersian
      ? "\n⚠️ هشدار: احتیاط کنید و از خریدهای هیجانی پرهیز کنید."
      : "\n⚠️ Warning: Be cautious and avoid impulsive buys.";
  } else {
    sentiment = "neutral";
    message = isPersian ? "➡️ بازار خنثی است.\n\n" : "➡️ Market is neutral.\n\n";
    message += isPersian
      ? `• ${upCount} نماد صعودی (${upRatio.toFixed(1)}٪)\n`
      : `• ${upCount} symbols advancing (${upRatio.toFixed(1)}%)\n`;
    message += isPersian
      ? `• ${downCount} نماد نزولی\n`
      : `• ${downCount} symbols declining\n`;
    message += isPersian
      ? "\n💡 پیشنهاد: منتظر شکست جهت باشید."
      : "\n💡 Suggestion: Wait for a directional breakout.";
  }

  // Analyze signals
  const buySignals = signals.filter((s) => s.signal === "buy").length;
  const sellSignals = signals.filter((s) => s.signal === "sell").length;

  message += isPersian ? `\n\n📊 وضعیت سیگنال‌ها:\n` : `\n\n📊 Signal status:\n`;
  message += isPersian
    ? `• سیگنال خرید: ${buySignals}\n`
    : `• Buy signals: ${buySignals}\n`;
  message += isPersian
    ? `• سیگنال فروش: ${sellSignals}\n`
    : `• Sell signals: ${sellSignals}\n`;

  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: message,
    timestamp: new Date(),
    metadata: {
      actionType: "analysis",
      confidence: 80,
    },
  };
}

/**
 * Generate portfolio suggestions based on current market data
 */
function suggestPortfolio(
  instruments: any[],
  signals: any[],
  config: AIAssistantConfig
): ChatMessage {
  const isPersian = config.language === "fa";
  const riskTolerance = config.defaultRiskTolerance;
  
  const buySignals = signals.filter(
    (s) => s.signal === "buy" && s.strength >= (riskTolerance === "low" ? 80 : riskTolerance === "medium" ? 70 : 60)
  );

  if (buySignals.length === 0) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      content: isPersian
        ? "❌ در حال حاضر سیگنال خرید قوی برای پیشنهاد سبد وجود ندارد.\n\nمنتظر سیگنال‌های بهتر باشید یا فیلترها را تغییر دهید."
        : "❌ No strong buy signals currently available for portfolio suggestions.\n\nWait for better signals or adjust filters.",
      timestamp: new Date(),
      metadata: { actionType: "warning" },
    };
  }

  // Select top 5 symbols
  const topSignals = buySignals
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .slice(0, 5);

  let message = isPersian ? "💼 پیشنهاد سبد سهام:\n\n" : "💼 Portfolio suggestions:\n\n";
  message += isPersian
    ? "بر اساس تحلیل فعلی، این نمادها پتانسیل خوبی دارند:\n\n"
    : "Based on current analysis, these symbols show good potential:\n\n";

  topSignals.forEach((signal: any, index: number) => {
    const allocation = Math.round((100 / topSignals.length) * 10) / 10;
    message += isPersian
      ? `${index + 1}. 🎯 ${signal.symbol}\n`
      : `${index + 1}. 🎯 ${signal.symbol}\n`;
    message += isPersian
      ? `   • سهم پیشنهادی: ${allocation}٪\n`
      : `   • Allocation: ${allocation}%\n`;
    message += isPersian
      ? `   • اعتماد: ${signal.strength}٪\n`
      : `   • Confidence: ${signal.strength}%\n`;
    message += isPersian
      ? `   • دلیل: ${signal.reasons?.[0] || "تحلیل تکنیکال مثبت"}\n\n`
      : `   • Reason: ${signal.reasons?.[0] || "Positive technical analysis"}\n\n`;
  });

  message += isPersian
    ? "\n⚠️ توجه: این پیشنهادها صرفاً تحلیلی هستند و مسئولیت معامله با شماست."
    : "\n⚠️ Note: These suggestions are analytical only. Trading responsibility is yours.";

  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: message,
    timestamp: new Date(),
    metadata: {
      actionType: "suggestion",
      confidence: 75,
    },
  };
}

/**
 * Analyze current signals
 */
function analyzeSignals(signals: any[], config: AIAssistantConfig): ChatMessage {
  const isPersian = config.language === "fa";
  
  const buyCount = signals.filter((s) => s.signal === "buy").length;
  const sellCount = signals.filter((s) => s.signal === "sell").length;
  const holdCount = signals.filter((s) => s.signal === "hold").length;

  let message = isPersian ? "📡 تحلیل سیگنال‌ها:\n\n" : "📡 Signal analysis:\n\n";
  message += isPersian
    ? `• سیگنال‌های خرید: ${buyCount}\n`
    : `• Buy signals: ${buyCount}\n`;
  message += isPersian
    ? `• سیگنال‌های فروش: ${sellCount}\n`
    : `• Sell signals: ${sellCount}\n`;
  message += isPersian
    ? `• سیگنال‌های نگهداری: ${holdCount}\n\n`
    : `• Hold signals: ${holdCount}\n\n`;

  if (buyCount > sellCount * 2) {
    message += isPersian
      ? "🟢 جو حاکم: صعودی\nفرصت‌های خرید بیشتر از فروش است."
      : "🟢 Market sentiment: Bullish\nMore buying opportunities than selling.";
  } else if (sellCount > buyCount * 2) {
    message += isPersian
      ? "🔴 جو حاکم: نزولی\nاحتیاط توصیه می‌شود."
      : "🔴 Market sentiment: Bearish\nCaution advised.";
  } else {
    message += isPersian
      ? "🟡 جو حاکم: متعادل\nانتخاب نمادهای خاص مهم است."
      : "🟡 Market sentiment: Balanced\nSelective symbol choice is important.";
  }

  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: message,
    timestamp: new Date(),
    metadata: {
      actionType: "analysis",
    },
  };
}

/**
 * Explain risk management principles
 */
function explainRisk(config: AIAssistantConfig): ChatMessage {
  const isPersian = config.language === "fa";
  
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: isPersian
      ? "🛡️ اصول مدیریت ریسک:\n\n" +
        "1️⃣ حد ضرر همیشه تعیین کنید (حداکثر 5-8٪)\n" +
        "2️⃣ حجم معامله را کنترل کنید (حداکثر 20٪ در یک نماد)\n" +
        "3️⃣ تنوع سبد داشته باشید (حداقل 5 نماد)\n" +
        "4️⃣ طمع نکنید - به حد سود پایبند باشید\n" +
        "5️⃣ اخبار و گزارش‌ها را دنبال کنید\n\n" +
        "💡 فرمول حجم معامله:\n" +
        "حجم = (سرمایه × ریسک مجاز) ÷ (ورود - حد ضرر)"
      : "🛡️ Risk Management Principles:\n\n" +
        "1️⃣ Always set stop-loss (max 5-8%)\n" +
        "2️⃣ Control position size (max 20% per symbol)\n" +
        "3️⃣ Diversify portfolio (at least 5 symbols)\n" +
        "4️⃣ Don't be greedy - stick to take-profit\n" +
        "5️⃣ Follow news and reports\n\n" +
        "💡 Position size formula:\n" +
        "Size = (Capital × Risk %) ÷ (Entry - Stop Loss)",
    timestamp: new Date(),
    metadata: {
      actionType: "info",
    },
  };
}

/**
 * Analyze news sentiment (placeholder for future implementation)
 */
function analyzeNewsSentiment(config: AIAssistantConfig): ChatMessage {
  const isPersian = config.language === "fa";
  
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: isPersian
      ? "📰 تحلیل احساسات اخبار:\n\n" +
        "در حال حاضر امکان تحلیل مستقیم اخبار وجود ندارد.\n\n" +
        "برای تحلیل اخبار پیشنهاد می‌کنم:\n" +
        "• گزارش‌های کدال را بررسی کنید\n" +
        "• اخبار اقتصادی را دنبال کنید\n" +
        "• به تغییرات حجم مشکوک توجه کنید\n\n" +
        "این ویژگی در نسخه‌های آینده بهبود خواهد یافت."
      : "📰 News Sentiment Analysis:\n\n" +
        "Direct news analysis is not currently available.\n\n" +
        "For news analysis, I recommend:\n" +
        "• Check Codal reports\n" +
        "• Follow economic news\n" +
        "• Watch for suspicious volume changes\n\n" +
        "This feature will be improved in future versions.",
    timestamp: new Date(),
    metadata: {
      actionType: "info",
    },
  };
}

/**
 * Calculate overall market score (0-100)
 */
export function calculateMarketScore(instruments: any[]): number {
  if (instruments.length === 0) return 50;

  const upRatio =
    instruments.filter((i) => i.changePercent > 0).length / instruments.length;
  const avgChange =
    instruments.reduce((sum, i) => sum + i.changePercent, 0) / instruments.length;

  const score =
    upRatio * 50 + Math.max(-5, Math.min(5, avgChange)) * 10 + 50;
  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Generate portfolio suggestions as structured data
 */
export function generatePortfolioSuggestions(
  instruments: any[],
  signals: any[],
  riskTolerance: "low" | "medium" | "high" = "medium"
): PortfolioSuggestion[] {
  const buySignals = signals.filter((s) => s.signal === "buy");

  // Filter based on risk tolerance
  let filteredSignals = buySignals;
  if (riskTolerance === "low") {
    filteredSignals = buySignals.filter((s) => s.strength >= 80);
  } else if (riskTolerance === "high") {
    filteredSignals = buySignals.filter((s) => s.strength >= 60);
  } else {
    filteredSignals = buySignals.filter((s) => s.strength >= 70);
  }

  const topSignals = filteredSignals
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .slice(0, 5);

  return topSignals.map((signal: any) => ({
    symbol: signal.symbol,
    allocation: Math.round((100 / topSignals.length) * 10) / 10,
    reason: signal.reasons?.[0] || "Positive technical analysis",
    riskLevel:
      signal.strength >= 80 ? "low" : signal.strength >= 70 ? "medium" : "high",
    expectedReturn: Math.round(signal.strength * 0.3 * 10) / 10,
    stopLoss: -5,
    takeProfit: 15,
    timeHorizon: "medium",
  }));
}

/**
 * AI Assistant Module Class - Main entry point
 */
export class AIAssistantModule {
  private config: AIAssistantConfig;
  private chatHistory: ChatMessage[] = [];

  constructor(config: Partial<AIAssistantConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.chatHistory = [getWelcomeMessage(this.config)];
  }

  /**
   * Send a message and get AI response
   */
  async sendMessage(
    query: string,
    marketData: any[],
    signals: any[]
  ): Promise<ChatMessage> {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: query,
      timestamp: new Date(),
    };

    this.chatHistory.push(userMessage);

    // Limit chat history size
    if (this.chatHistory.length > this.config.maxChatHistory) {
      this.chatHistory = this.chatHistory.slice(-this.config.maxChatHistory);
    }

    // Process query and get response
    const response = processUserQuery(
      query,
      marketData,
      signals,
      this.config
    );
    this.chatHistory.push(response);

    return response;
  }

  /**
   * Get chat history
   */
  getHistory(): ChatMessage[] {
    return [...this.chatHistory];
  }

  /**
   * Clear chat history
   */
  clearHistory(): void {
    this.chatHistory = [getWelcomeMessage(this.config)];
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AIAssistantConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current market analysis
   */
  getMarketAnalysis(marketData: any[], signals: any[]): MarketAnalysis {
    const score = calculateMarketScore(marketData);
    const sentiment =
      score > 60 ? "bullish" : score < 40 ? "bearish" : "neutral";

    return {
      overallSentiment: sentiment,
      confidence: Math.abs(score - 50) * 2,
      keyFactors: [
        `Market score: ${score}/100`,
        `${marketData.filter((i) => i.changePercent > 0).length} advancing symbols`,
        `${signals.filter((s) => s.signal === "buy").length} buy signals`,
      ],
      recommendedAction:
        score > 60 ? "buy" : score < 40 ? "sell" : "hold",
      technicalScore: score,
    };
  }
}

// Export singleton instance for convenience
let _instance: AIAssistantModule | null = null;

export function getAIAssistant(
  config?: Partial<AIAssistantConfig>
): AIAssistantModule {
  if (!_instance) {
    _instance = new AIAssistantModule(config);
  }
  return _instance;
}
