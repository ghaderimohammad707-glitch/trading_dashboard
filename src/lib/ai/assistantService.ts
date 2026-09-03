/**
 * AI Assistant Service with LLM Integration
 * Provides intelligent market analysis using real-time data context
 */

interface MarketContext {
  symbol?: string;
  price?: number;
  changePercent?: number;
  volume?: number;
  technicalSignals?: {
    rsi?: number;
    macd?: string;
    trend?: string;
  };
  newsSentiment?: 'positive' | 'negative' | 'neutral';
  recentNews?: string[];
}

interface AIResponse {
  answer: string;
  confidence: number;
  sources?: string[];
  timestamp: number;
}

// Configuration for LLM providers (ready for Groq, Gemini, etc.)
const LLM_CONFIG = {
  provider: process.env.VITE_LLM_PROVIDER || 'groq',
  apiKey: process.env.VITE_LLM_API_KEY || '',
  model: process.env.VITE_LLM_MODEL || 'llama-3.1-8b-instant',
  endpoint: process.env.VITE_LLM_ENDPOINT || 'https://api.groq.com/openai/v1/chat/completions',
};

export class AIAssistantService {
  /**
   * Build context from market data
   */
  private buildContext(context: MarketContext): string {
    const parts: string[] = [];

    if (context.symbol) {
      parts.push(`نماد: ${context.symbol}`);
    }

    if (context.price !== undefined) {
      parts.push(`قیمت فعلی: ${context.price.toLocaleString('fa-IR')}`);
    }

    if (context.changePercent !== undefined) {
      const direction = context.changePercent >= 0 ? 'مثبت' : 'منفی';
      parts.push(`تغییر قیمت: ${Math.abs(context.changePercent).toFixed(2)}% (${direction})`);
    }

    if (context.volume !== undefined) {
      parts.push(`حجم معاملات: ${context.volume.toLocaleString('fa-IR')}`);
    }

    if (context.technicalSignals) {
      const signals = context.technicalSignals;
      if (signals.rsi !== undefined) {
        parts.push(`RSI: ${signals.rsi.toFixed(1)}`);
      }
      if (signals.macd) {
        parts.push(`MACD: ${signals.macd}`);
      }
      if (signals.trend) {
        parts.push(`روند: ${signals.trend}`);
      }
    }

    if (context.newsSentiment) {
      const sentimentMap = {
        positive: 'مثبت',
        negative: 'منفی',
        neutral: 'خنثی',
      };
      parts.push(`احساسات اخبار: ${sentimentMap[context.newsSentiment]}`);
    }

    if (context.recentNews && context.recentNews.length > 0) {
      parts.push(`اخبار اخیر: ${context.recentNews.slice(0, 3).join('، ')}`);
    }

    return parts.join(' | ');
  }

  /**
   * Send query to LLM with market context
   */
  async ask(question: string, context: MarketContext = {}): Promise<AIResponse> {
    const marketContext = this.buildContext(context);
    
    const systemPrompt = `شما یک دستیار هوشمند تحلیل بازار سرمایه ایران هستید. 
با توجه به داده‌های زیر به سوالات کاربران پاسخ دهید.
پاسخ‌ها باید کوتاه، دقیق و مبتنی بر داده باشند.
اگر اطلاعات کافی ندارید، صادقانه بگویید که نمی‌دانید.

داده‌های بازار:
${marketContext}

همیشه به فارسی پاسخ دهید.`;

    // If no API key is configured, return a helpful fallback
    if (!LLM_CONFIG.apiKey) {
      return this.getFallbackResponse(question, context);
    }

    try {
      const response = await fetch(LLM_CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LLM_CONFIG.apiKey}`,
        },
        body: JSON.stringify({
          model: LLM_CONFIG.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status}`);
      }

      const data = await response.json();
      const answer = data.choices?.[0]?.message?.content || 'پاسخی دریافت نشد';

      return {
        answer,
        confidence: 85, // Could be improved with logprobs
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('AI Assistant error:', error);
      return this.getFallbackResponse(question, context);
    }
  }

  /**
   * Fallback response when LLM is not available
   */
  private getFallbackResponse(question: string, context: MarketContext): AIResponse {
    let answer = 'در حال حاضر اتصال به هوش مصنوعی برقرار نیست. ';

    if (context.symbol) {
      answer += `برای تحلیل ${context.symbol}، می‌توانید از تب‌های تابلوخوانی، تکنیکال و بنیادی استفاده کنید. `;
    }

    if (context.changePercent !== undefined) {
      if (context.changePercent > 5) {
        answer += 'رشد قابل توجهی مشاهده می‌شود - حتماً حجم معاملات و ورود پول هوشمند را بررسی کنید.';
      } else if (context.changePercent < -5) {
        answer += 'افت قابل توجهی مشاهده می‌شود - خروج نقدینگی و فشار فروش را بررسی کنید.';
      }
    }

    if (question.includes('خرید') || question.includes('فروش')) {
      answer += ' توجه: این سیستم فقط ابزار تحلیلی است و توصیه مالی مستقیم ارائه نمی‌دهد.';
    }

    return {
      answer,
      confidence: 50,
      timestamp: Date.now(),
    };
  }

  /**
   * Quick analysis for a symbol
   */
  async quickAnalysis(symbol: string, context: MarketContext): Promise<string> {
    const question = `تحلیل سریع برای ${symbol} با توجه به شرایط فعلی چیست؟`;
    const response = await this.ask(question, context);
    return response.answer;
  }

  /**
   * Explain a signal
   */
  async explainSignal(signalType: string, details: object): Promise<string> {
    const question = `چرا سیگنال ${signalType} صادر شده است؟ توضیح بده: ${JSON.stringify(details)}`;
    const response = await this.ask(question);
    return response.answer;
  }
}

export const aiAssistantService = new AIAssistantService();
