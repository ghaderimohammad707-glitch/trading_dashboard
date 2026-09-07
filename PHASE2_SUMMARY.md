# 🚀 فاز ۲: موتور بک‌تست و بهینه‌سازی استراتژی

## ✅ وضعیت اجرا: **تکمیل شده**

---

## 📋 خلاصه فاز ۲

در این فاز، موتور کامل بک‌تست با قابلیت‌های پیشرفته تحلیل عملکرد و بهینه‌سازی استراتژی پیاده‌سازی شد.

### 🎯 اهداف محقق شده:
- ✅ اجرای استراتژی‌ها روی داده‌های تاریخی
- ✅ محاسبه شاخص‌های عملکرد حرفه‌ای (Win Rate, Drawdown, Profit Factor)
- ✅ امتیازدهی به سیگنال‌ها بر اساس Confidence
- ✅ پشتیبانی از کارمزد و Slippage واقعی
- ✅ Walk-Forward Optimization برای جلوگیری از Overfitting
- ✅ معیارهای پیشرفته ریسک و بازده (Sharpe, Sortino, Calmar, VaR, CVaR)

---

## 📁 فایل‌های ایجاد شده

| فایل | توضیحات | خطوط کد |
|------|---------|---------|
| `src/lib/backtest/engine.ts` | هسته اصلی بک‌تست | ~200 |
| `src/lib/backtest/types.ts` | انواع و توابع کمکی | ~180 |
| `src/lib/backtest/walkforward.ts` | بهینه‌سازی Walk-Forward | ~230 |
| `src/lib/backtest/metrics.ts` | معیارهای پیشرفته | ~460 |
| `src/lib/backtest/engine.test.ts` | تست‌های واحد Engine | ~170 |
| `src/lib/backtest/walkforward.test.ts` | تست‌های واحد Walk-Forward | ~200 |
| `src/lib/backtest/metrics.test.ts` | تست‌های واحد Metrics | ~370 |

**مجموع:** ~1,810 خط کد + تست

---

## 🔧 ماژول‌های اصلی

### ۱. BacktestEngine (`engine.ts`)

هسته اصلی بک‌تست که وظایف زیر را انجام می‌دهد:

```typescript
const engine = new BacktestEngine({
  initialCapital: 100000,
  commissionRate: 0.0008,      // 0.08% کارمزد
  slippageRate: 0.001,         // 0.1% اسلیپیج
  startDate: '2023-01-01',
  endDate: '2023-12-31',
  symbol: 'TEST'
});

// پردازش کندل‌ها و سیگنال‌ها
candles.forEach((candle, i) => {
  engine.processCandle(candle, signals[i]);
});

// دریافت گزارش نهایی
const report = engine.generateReport();
```

#### ویژگی‌ها:
- ✅ پشتیبانی از پوزیشن‌های LONG و SHORT
- ✅ محاسبه دقیق کارمزد و Slippage
- ✅ مدیریت Target Price و Stop Loss
- ✅ تولید Equity Curve
- ✅ محاسبه Sharpe Ratio و Sortino Ratio

---

### ۲. WalkForwardOptimizer (`walkforward.ts`)

الگوریتم Walk-Forward برای بهینه‌سازی پارامترها بدون Overfitting:

```typescript
const optimizer = new WalkForwardOptimizer(
  data,
  config,
  {
    trainPeriods: 90,    // ۹۰ روز آموزش
    testPeriods: 30,     // ۳۰ روز تست
    stepSize: 30,        // گام ۳۰ روزه
    minDataPoints: 20
  },
  signalGenerator  // تابع تولید سیگنال
);

const results = optimizer.run({
  lookback: [5, 10, 15],
  threshold: [0.01, 0.02, 0.03]
});

const analysis = optimizer.analyzeResults(results);
console.log('Robustness Score:', analysis.robustnessScore);
```

#### مزایا:
- ✅ جلوگیری از Overfitting
- ✅ شبیه‌سازی شرایط واقعی بازار
- ✅ اعتبارسنجی روی داده‌های ندیده (Out-of-Sample)
- ✅ Grid Search برای یافتن بهترین پارامترها

#### خروجی تحلیل:
```typescript
{
  avgOOSPerformance: 0.085,      // میانگین عملکرد Out-of-Sample
  stdOOSPerformance: 0.023,      // انحراف معیار
  consistentProfitability: 0.75, // ۷۵٪ فولدها سودده
  avgWinRate: 0.62,              // میانگین نرخ برد
  robustnessScore: 0.88          // نسبت OOS به IS
}
```

---

### ۳. AdvancedMetrics (`metrics.ts`)

محاسبه ۳۰+ معیار پیشرفته برای ارزیابی استراتژی:

#### شاخص‌های اصلی:
| معیار | فرمول | تفسیر |
|-------|-------|--------|
| **Total Return** | `(Final - Initial) / Initial` | بازده کل |
| **Annualized Return** | `(1 + TotalReturn)^(1/Years) - 1` | بازده سالانه |
| **Max Drawdown** | `Max Peak-to-Trough Decline` | حداکثر افت سرمایه |
| **Max Drawdown Duration** | `Longest Recovery Period` | طولانی‌ترین دوره افت |

#### نسبت‌های ریسک-بازده:
| معیار | فرمول | کاربرد |
|-------|-------|--------|
| **Sharpe Ratio** | `(Return - RiskFree) / StdDev` | بازده تعدیل‌شده با ریسک کل |
| **Sortino Ratio** | `(Return - RiskFree) / DownsideDev` | بازده تعدیل‌شده با ریسک نزولی |
| **Calmar Ratio** | `AnnualReturn / MaxDrawdown` | بازده نسبت به افت سرمایه |
| **Sterling Ratio** | `AnnualReturn / AvgLargeDrawdowns` | نسخه بهبودیافته Calmar |
| **Burke Ratio** | `AnnualReturn / √(ΣDD²)` | استفاده از مربعات افت‌ها |

#### کیفیت ترید:
| معیار | توضیح |
|-------|-------|
| **Win Rate** | درصد تریدهای سودده |
| **Profit Factor** | `GrossProfit / GrossLoss` |
| **Payoff Ratio** | `AvgWin / AvgLoss` |
| **Expectancy** | `(WinRate × AvgWin) - (LossRate × AvgLoss)` |

#### آماره‌های ترید:
- `totalTrades`: تعداد کل تریدها
- `winningTrades` / `losingTrades`: تریدهای سودده/زیان‌ده
- `avgWin` / `avgLoss`: میانگین سود/زیان
- `largestWin` / `largestLoss`: بزرگترین سود/زیان
- `avgTradeDuration`: مدت زمان متوسط ترید

#### معیارهای ریسک:
| معیار | توضیح |
|-------|-------|
| **Volatility** | انحراف معیار بازده‌ها (سالانه) |
| **Downside Deviation** | انحراف معیار بازده‌های منفی |
| **Value at Risk (VaR 95%)** | بدترین زیان مورد انتظار در ۹۵٪ موارد |
| **Conditional VaR (CVaR)** | میانگین بدترین ۵٪ موارد |

#### پایداری:
| معیار | توضیح |
|-------|-------|
| **Consecutive Wins** | بیشترین برد متوالی |
| **Consecutive Losses** | بیشترین باخت متوالی |
| **Recovery Factor** | `NetProfit / MaxDrawdown` |
| **R-Squared** | ضریب تعیین برای خط تعادل سرمایه |

---

### ۴. Strategy Score (`calculateStrategyScore`)

امتیاز کلی استراتژی از ۰ تا ۱۰۰:

```typescript
const metrics = calculateAdvancedMetrics(report);
const score = calculateStrategyScore(metrics);
console.log(`Strategy Score: ${score}/100`);
```

#### وزن‌دهی معیارها:
| معیار | وزن | شرط |
|-------|-----|-----|
| Sharpe Ratio | 20% | > 0 |
| Max Drawdown | 15% | < 50% |
| Win Rate | 15% | > 30% |
| Profit Factor | 15% | > 1 |
| Recovery Factor | 10% | > 0 |
| R-Squared | 10% | پایداری |
| Consecutive Losses | 10% | < 10 |

#### تفسیر امتیاز:
- **۸۰-۱۰۰**: استراتژی عالی ⭐⭐⭐⭐⭐
- **۶۰-۷۹**: استراتژی خوب ⭐⭐⭐⭐
- **۴۰-۵۹**: استراتژی متوسط ⭐⭐⭐
- **۲۰-۳۹**: استراتژی ضعیف ⭐⭐
- **۰-۱۹**: استراتژی غیرقابل قبول ⭐

---

### ۵. Risk Analysis (`analyzeRisk`)

تحلیل جامع ریسک استراتژی:

```typescript
const riskMetrics = analyzeRisk(report);
console.log({
  var95: riskMetrics.var95,           // Value at Risk
  cvar95: riskMetrics.cvar95,         // Conditional VaR
  maxConsecutiveLosses: riskMetrics.maxConsecutiveLosses,
  worstDrawdownPeriod: riskMetrics.worstDrawdownPeriod
});
```

#### خروجی نمونه:
```json
{
  "var95": 0.023,
  "cvar95": 0.031,
  "maxConsecutiveLosses": 4,
  "worstDrawdownPeriod": {
    "start": "2023-03-15",
    "end": "2023-04-20",
    "duration": 36,
    "drawdown": 0.127
  }
}
```

---

## 🧪 تست‌های واحد

### پوشش تست:
- ✅ **Engine Tests** (8 تست): پردازش تریدها، کارمزد، SL/TP
- ✅ **Walk-Forward Tests** (8 تست): بهینه‌سازی پارامترها، تحلیل نتایج
- ✅ **Metrics Tests** (15 تست): تمام معیارهای پیشرفته

---

## 📈 معیارهای کلیدی عملکرد (KPI)

| KPI | مقدار هدف | وضعیت |
|-----|-----------|-------|
| تعداد معیارهای محاسبه‌شده | 30+ | ✅ |
| پشتیبانی از LONG/SHORT | بله | ✅ |
| Walk-Forward Optimization | بله | ✅ |
| امتیازدهی استراتژی | 0-100 | ✅ |
| تحلیل ریسک جامع | VaR, CVaR, DD | ✅ |

---

## 🚀 آماده برای فاز ۳

زیرساخت بک‌تست اکنون کامل است و می‌تواند:
- ✅ استراتژی‌های مختلف را ارزیابی کند
- ✅ پارامترها را بهینه کند
- ✅ معیارهای حرفه‌ای محاسبه کند
- ✅ امتیاز Confidence به سیگنال‌ها دهد
- ✅ تحلیل ریسک جامع ارائه دهد

---

**تاریخ تکمیل:** 2024
**وضعیت:** ✅ تکمیل شده
**تعداد خطوط کد:** ~1,810
**تعداد تست‌ها:** 31
