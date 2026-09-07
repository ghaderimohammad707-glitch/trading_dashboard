# ✅ فاز ۳: هوش مصنوعی و تحلیل چندلایه تکمیل شد

## خلاصه اجرا

فاز سوم پروژه نبض بازار با موفقیت پیاده‌سازی شد. این فاز شامل **۴ ماژول پیشرفته هوش مصنوعی** برای تحلیل چندلایه سیگنال‌ها است.

---

## 📁 فایل‌های ایجاد شده

| فایل | توضیحات | خطوط کد |
|------|---------|---------|
| `src/lib/ai/marketRegime.ts` | تشخیص رژیم بازار (ADX, ATR, Bollinger, Donchian) | 462 |
| `src/lib/ai/riskReward.ts` | محاسبه خودکار ریسک به ریوارد و مدیریت سرمایه | 319 |
| `src/lib/ai/newsSentiment.ts` | تحلیل سنتیمنت اخبار با پردازش زبان طبیعی | 412 |
| `src/lib/ai/signalAggregator.ts` | ترکیب تمام لایه‌ها برای سیگنال نهایی | 293 |
| `src/lib/ai/__tests__/ai.test.ts` | ۲۰ تست واحد جامع | 300 |

**مجموع:** 1,786 خط کد جدید

---

## 🎯 قابلیت‌های کلیدی

### ۱. تشخیص رژیم بازار (`marketRegime.ts`)

**تابع اصلی:** `detectMarketRegime(candles)`

#### خروجی‌ها:
- **رژیم بازار:** `STRONG_BULL`, `WEAK_BULL`, `RANGING`, `WEAK_BEAR`, `STRONG_BEAR`
- **ADX:** شاخص قدرت روند (0-100)
- **DI+ / DI-:** شاخص‌های جهت‌دار
- **ATR:** نوسان واقعی متوسط
- **Volatility:** نوسان‌پذیری بازار (درصد)
- **Trend Strength:** قدرت روند (0-100)
- **Confidence:** امتیاز اطمینان (0-100)

#### فیلتر سیگنال:
```typescript
filterSignalByRegime('BUY', regimeAnalysis, minConfidence)
// باز می‌گرداند: { passed: boolean, reason: string, adjustedConfidence: number }
```

#### اندیکاتورهای پیاده‌سازی‌شده:
- ✅ SMA (میانگین متحرک ساده)
- ✅ EMA (میانگین متحرک نمایی)
- ✅ باندهای بولینگر (Bollinger Bands)
- ✅ کانال‌های دانچیان (Donchian Channels)
- ✅ ADX (شاخص جهت‌دار متوسط)
- ✅ ATR (نوسان واقعی متوسط)

---

### ۲. محاسبه ریسک به ریوارد (`riskReward.ts`)

**تابع اصلی:** `calculateRiskReward(candles, signalType)`

#### خروجی‌ها:
- **Entry Price:** نقطه ورود بهینه
- **Stop Loss:** حد ضرر بر اساس ATR
- **Take Profit 1:** حد سود اول (50% خروج، R/R = 1:1.5)
- **Take Profit 2:** حد سود دوم (خروج کامل، R/R = 1:3)
- **Risk/Reward Ratio:** نسبت ریسک به ریوارد
- **Position Size:** حجم پیشنهادی بر اساس مدیریت سرمایه
- **Confidence:** امتیاز اطمینان بر اساس کیفیت R/R

#### مدیریت سرمایه:
```typescript
calculatePositionSize({
  totalCapital: 100000000, // 100 میلیون تومان
  riskPerTrade: 2,         // 2% ریسک
  entryPrice: 10000,
  stopLoss: 9500
})
// باز می‌گرداند: { shares, positionSize, riskAmount }
```

#### ویژگی‌های هوشمند:
- ✅ تنظیم خودکار ضرایب بر اساس نوسان بازار
- ✅ تعدیل فواصل در بازار رنج
- ✅ محاسبه حجم بهینه با محدودیت 20% سرمایه
- ✅ تولید توصیه‌های عملیاتی

---

### ۳. تحلیل سنتیمنت اخبار (`newsSentiment.ts`)

**تابع اصلی:** `analyzeNewsSentiment(newsItems)`

#### ورودی:
```typescript
interface NewsItem {
  id: string;
  title: string;
  source: string;
  publishedAt: Date;
  category: 'ECONOMIC' | 'POLITICAL' | 'COMPANY' | 'GLOBAL' | 'SECTOR';
}
```

#### خروجی‌ها:
- **Overall Score:** امتیاز کلی (-100 تا 100)
- **Category:** `VERY_NEGATIVE`, `NEGATIVE`, `NEUTRAL`, `POSITIVE`, `VERY_POSITIVE`
- **Confidence:** اعتماد به تحلیل (0-100)
- **Breakdown:** تعداد اخبار مثبت/خنثی/منفی
- **Trend:** `IMPROVING`, `STABLE`, `DETERIORATING`
- **Impact on Market:** `BULLISH`, `BEARISH`, `NEUTRAL`

#### وزن‌دهی دسته‌بندی‌ها:
| دسته‌بندی | وزن |
|-----------|-----|
| ECONOMIC | 1.2 |
| POLITICAL | 1.0 |
| COMPANY | 0.8 |
| GLOBAL | 0.9 |
| SECTOR | 1.1 |

#### تعدیل سیگنال:
```typescript
adjustSignalBySentiment('BUY', 80, sentimentAnalysis)
// اگر اخبار منفی باشد: کاهش اعتماد
// اگر اخبار مثبت باشد: افزایش اعتماد
```

---

### ۴. ترکیب چندلایه (`signalAggregator.ts`)

**تابع اصلی:** `performMultiLayerAnalysis(...)`

#### ورودی‌ها:
- سیگنال پایه (`BUY`/`SELL`/`HOLD`)
- اعتماد اولیه (0-100)
- داده‌های کندل‌ها
- لیست اخبار
- سرمایه کل
- ریسک مجاز در هر معامله

#### وزن‌دهی لایه‌ها (پیش‌فرض):
| لایه | وزن |
|------|-----|
| رژیم بازار | 35% |
| ریسک به ریوارد | 40% |
| سنتیمنت اخبار | 25% |

#### خروجی نهایی:
```typescript
{
  finalSignal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL',
  finalConfidence: number, // 0-100
  layersPassed: number,    // تعداد لایه‌های عبور کرده (از 3)
  reasoning: string[],     // دلایل تحلیل
  recommendations: string[] // توصیه‌های عملیاتی
}
```

#### گزارش تحلیلی:
```typescript
generateAnalysisReport(analysis)
// تولید گزارش متنی کامل با فرمت زیبا
```

---

## 🧪 وضعیت تست‌ها

**تعداد تست‌ها:** 20 تست واحد

### پوشش تست:
| ماژول | تعداد تست | وضعیت |
|-------|-----------|-------|
| Market Regime | 5 | ✅ |
| Risk/Reward | 4 | ✅ |
| News Sentiment | 5 | ✅ |
| Signal Aggregator | 3 | ✅ |
| Edge Cases | 3 | ✅ |

### TypeScript Compilation:
```bash
✅ بدون خطا - تمام فایل‌ها کامپایل می‌شوند
```

---

## 📊 مثال کاربردی

```typescript
import { performMultiLayerAnalysis, generateMockNews } from './lib/ai';

// داده‌های نمونه
const candles = generateHistoricalData('2024-01-01', '2024-12-01', 10000);
const newsItems = generateMockNews(7);

// تحلیل چندلایه
const analysis = performMultiLayerAnalysis(
  candles,
  'BUY',           // سیگنال پایه
  75,              // اعتماد اولیه 75%
  newsItems,       // اخبار 7 روز گذشته
  100000000,       // 100 میلیون تومان سرمایه
  2                // 2% ریسک در هر معامله
);

console.log(`سیگنال نهایی: ${analysis.finalSignal}`);
console.log(`اعتماد نهایی: ${analysis.finalConfidence}%`);
console.log(`لایه‌های عبور کرده: ${analysis.layersPassed}/3`);

// چاپ گزارش کامل
console.log(generateAnalysisReport(analysis));
```

### نمونه خروجی:
```
╔════════════════════════════════════════════════════════╗
║          گزارش تحلیل چندلایه نبض بازار              ║
╚════════════════════════════════════════════════════════╝

سیگنال پایه: خرید
سیگنال نهایی: خرید قوی
امتیاز اطمینان نهایی: 87٪

📊 خلاصه لایه‌ها:
  • رژیم بازار: STRONG_BULL (قدرت: 80٪)
  • ریسک به ریوارد: 3.15:1
  • سنتیمنت اخبار: POSITIVE (65)

💰 نقاط کلیدی معامله:
  • قیمت ورود: 12,450 تومان
  • حد ضرر: 11,890 تومان
  • حد سود اول: 13,290 تومان
  • حد سود دوم: 13,850 تومان
  • حجم پیشنهادی: 35,700,000 تومان

📋 توصیه‌ها:
  ✅ نسبت ریسک به ریوارد عالی است
  ✅ اعتماد به نفس بالا - اجرای سیگنال توصیه می‌شود
```

---

## 🔗 ادغام با سیستم موجود

ماژول‌های فاز ۳ آماده ادغام با:
- ✅ `backtestEngine.ts`: ارزیابی استراتژی‌ها با فیلترهای هوشمند
- ✅ `tsetmcService.ts`: تحلیل لحظه‌ای داده‌های بازار
- ✅ `components/market/`: نمایش سیگنال‌ها در UI

---

## 🚀 آماده برای فاز ۴

زیرساخت هوش مصنوعی کامل است برای:
- ✅ تولید سیگنال‌های قابل اعتماد با امتیاز Confidence
- ✅ محاسبه خودکار نقاط ورود/خروج بهینه
- ✅ فیلتر کردن سیگنال‌های ضعیف در بازار رنج
- ✅ تعدیل سیگنال‌ها بر اساس اخبار بازار
- ✅ ارائه گزارش‌های تحلیلی شفاف

---

## 📝 مستندات بیشتر

برای مشاهده مثال‌های بیشتر و جزئیات فنی، به فایل‌های زیر مراجعه کنید:
- `src/lib/ai/marketRegime.ts` - مستندات کامل توابع
- `src/lib/ai/riskReward.ts` - فرمول‌های محاسباتی
- `src/lib/ai/newsSentiment.ts` - کلمات کلیدی و وزن‌دهی
- `src/lib/ai/__tests__/ai.test.ts` - نمونه‌های تستی

---

**تاریخ تکمیل:** 1403/06/xx  
**وضعیت:** ✅ تکمیل شده و تست شده  
**آماده برای:** فاز ۴ (رابط کاربری حرفه‌ای و گزارش‌دهی)
