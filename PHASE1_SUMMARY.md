# 📊 فاز ۱: زیرساخت داده و اعتبارسنجی (تکمیل شد)

## خلاصه اجرا

فاز اول پروژه با موفقیت پیاده‌سازی شد. این فاز شامل سه ماژول اصلی برای اطمینان از صحت داده‌های ورودی و مدیریت خطاهای شبکه است.

---

## ✅ قابلیت‌های پیاده‌سازی شده

### ۱. اعتبارسنجی داده‌ها (Data Validation & Sanitization)
**فایل:** `src/lib/dataValidation.ts`

#### توابع اصلی:

- **`validateCandle(candle)`**: بررسی صحت داده‌های هر کندل
  - تشخیص مقادیر منفی
  - بررسی منطق High/Low
  - شناسایی نوسانات غیرعادی (>20%)
  - تشخیص قیمت صفر

- **`detectOutliers(data, config)`**: تشخیص داده‌های پرت با ۳ روش:
  - **Z-Score**: مبتنی بر انحراف معیار
  - **IQR**: مبتنی بر چارک‌ها (پیش‌فرض)
  - **MAD**: مبتنی بر میانه

- **`validateTimeSeries(data)`**: اعتبارسنجی سری زمانی
  - بررسی ترتیب زمانی
  - تشخیص داده‌های گمشده
  - اعتبارسنجی جمعی کندل‌ها

- **`sanitizeData(data)`**: تمیزکاری و اصلاح داده‌ها
  - اصلاح High/Low متناقض
  - اصلاح حجم منفی
  - پر کردن داده‌های NaN با Forward Fill
  - هموارسازی حجم با میانگین متحرک

- **`normalizeData(data)`**: نرمال‌سازی داده‌ها به بازه 0-1

- **`convertToOHLCV(data)`**: تبدیل داده‌های خام به فرمت استاندارد OHLCV

- **`processMarketData(rawData, options)`**: پایپ‌لاین کامل پردازش داده
  ```typescript
  const result = processMarketData(rawData, {
    removeOutliers: true,
    outlierMethod: 'iqr',
    sanitize: true,
    validate: true
  });
  // خروجی: { data, validation, outlierCount }
  ```

---

### ۲. مدیریت خطای شبکه (Network Error Handling & Retry)
**فایل:** `src/lib/networkRetry.ts`

#### کلاس‌ها و توابع:

- **`withRetry(fn, config)`**: اجرای تابع با مکانیزم Retry خودکار
  - الگوریتم Exponential Backoff + Jitter
  - تشخیص خطاهای قابل Retry
  - گزارش تعداد تلاش‌ها و تاخیر کل

  ```typescript
  const result = await withRetry(
    () => fetch('/api/data'),
    { maxRetries: 3, initialDelay: 1000 }
  );
  
  if (result.success) {
    console.log('Data:', result.data);
  } else {
    console.error('Failed after', result.attempts, 'attempts');
  }
  ```

- **`CircuitBreaker`**: الگوی Circuit Breaker برای جلوگیری از درخواست‌های مکرر
  - ۳ وضعیت: CLOSED, OPEN, HALF_OPEN
  - تنظیم آستانه شکست و موفقیت
  - Timeout خودکار برای بازیابی

  ```typescript
  const breaker = new CircuitBreaker({
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 60000
  });

  try {
    const data = await breaker.execute(() => apiCall());
    breaker.recordSuccess();
  } catch (error) {
    breaker.recordFailure();
  }
  ```

- **`ResilientRequest`**: ترکیب Retry + Circuit Breaker
  ```typescript
  const resilient = new ResilientRequest({
    retry: { maxRetries: 3 },
    circuitBreaker: { failureThreshold: 5 }
  });

  const result = await resilient.execute(() => fetchData());
  ```

- **`NetworkMonitor`**: مانیتورینگ وضعیت آنلاین/آفلاین
  - اشتراک در تغییرات شبکه
  - انتظار برای اتصال مجدد
  - دریافت آمار شبکه

  ```typescript
  const unsubscribe = networkMonitor.subscribe((online) => {
    if (!online) {
      console.warn('Connection lost!');
    }
  });

  // بعداً
  unsubscribe();
  ```

---

### ۳. کشینگ هوشمند (Smart Caching)
**فایل:** `src/lib/cache/smartCache.ts` (از قبل موجود بود)

- TTL پویا بر اساس نوع داده
- انواع cache: price, depth, historical, base, news, ai
- متد `isStale()` برای بررسی کهنگی داده
- متد `getMetadata()` برای دریافت اطلاعات کش

---

## 🧪 آزمون‌های واحد

**فایل:** `src/lib/__tests__/dataValidation.test.ts`

### پوشش تست:

#### Data Validation Tests:
- ✅ `validateCandle`: ۵ تست
  - داده معتبر
  - قیمت منفی
  - خطای High/Low
  - نوسان غیرعادی
  - قیمت صفر

- ✅ `detectOutliers`: ۳ تست
  - روش IQR
  - پاکسازی داده
  - روش Z-Score

- ✅ `validateTimeSeries`: ۳ تست
  - سری زمانی معتبر
  - داده خالی
  - نقض ترتیب زمانی

- ✅ `sanitizeData`: ۳ تست
  - اصلاح High/Low
  - حجم منفی
  - هموارسازی حجم

- ✅ `normalizeData`: ۳ تست
  - نرمال‌سازی به 0-1
  - metadata minMax
  - داده خالی

- ✅ `convertToOHLCV`: ۲ تست
  - تبدیل داده خام
  - فیلتر کندل نامعتبر

- ✅ `processMarketData`: ۲ تست
  - پایپ‌لاین کامل
  - شمارش Outlier

#### Network Retry Tests:
- ✅ `withRetry`: ۴ تست
  - موفقیت در تلاش اول
  - Retry پس از شکست
  - شکست پس از حداکثر تلاش
  - عدم Retry برای خطاهای غیرقابل بازیابی

- ✅ `CircuitBreaker`: ۷ تست
  - وضعیت اولیه CLOSED
  - باز شدن پس از آستانه شکست
  - انتقال به HALF_OPEN پس از timeout
  - بسته شدن پس از موفقیت
  - اجرای تابع در حالت CLOSED
  - رد درخواست در حالت OPEN

- ✅ `ResilientRequest`: ۲ تست
  - ترکیب Retry و Circuit Breaker
  - دریافت آمار

**مجموع:** ۳۴ تست واحد

---

## 📦 وابستگی‌های نصب شده

```json
{
  "technicalindicators": "^3.1.0"
}
```

سایر وابستگی‌ها از قبل موجود بودند:
- `date-fns`, `date-fns-jalali`
- `zod`
- `axios`
- `lightweight-charts`
- `recharts`
- `xlsx`

---

## 🔧 نحوه استفاده

### مثال ۱: پردازش داده‌های تاریخی

```typescript
import { processMarketData } from '@/lib/dataValidation';

// دریافت داده خام از API
const rawData = await tsetmcService.getHistoricalData('SHAZAR', 60);

// پردازش کامل
const result = processMarketData(rawData, {
  removeOutliers: true,
  outlierMethod: 'iqr',
  sanitize: true,
  validate: true
});

if (result.validation.isValid) {
  console.log('✅ داده‌ها معتبر هستند');
  console.log(`تعداد Outlierها: ${result.outlierCount}`);
  
  // استفاده در بک‌تست
  const backtestResult = runBacktest(result.data, signals);
} else {
  console.error('❌ خطاهای داده:', result.validation.issues);
}
```

### مثال ۲: درخواست API با مقاومت خطا

```typescript
import { defaultResilientRequest, networkMonitor } from '@/lib/networkRetry';

// بررسی وضعیت شبکه
networkMonitor.subscribe((online) => {
  if (!online) {
    toast.error('ارتباط با سرور قطع شد');
  }
});

// درخواست با Retry و Circuit Breaker
const result = await defaultResilientRequest.execute(async () => {
  return await tsetmcService.getMarketWatch(symbol);
});

if (result.success) {
  console.log('Market Data:', result.data);
} else {
  console.error(`شکست پس از ${result.attempts} تلاش:`, result.error);
  
  // بررسی وضعیت Circuit Breaker
  const stats = defaultResilientRequest.getCircuitBreakerStats();
  console.log('Circuit Breaker Status:', stats);
}
```

### مثال ۳: ترکیب با بک‌تست

```typescript
import { processMarketData } from '@/lib/dataValidation';
import { runBacktest, smaStrategy } from '@/lib/backtestEngine';

async function runRobustBacktest(symbol: string) {
  // 1. دریافت داده
  const rawData = await tsetmcService.getHistoricalData(symbol, 250);
  
  // 2. پردازش و اعتبارسنجی
  const { data, validation } = processMarketData(rawData);
  
  if (!validation.isValid) {
    throw new Error('داده‌های نامعتبر: ' + validation.issues.join(', '));
  }
  
  // 3. استخراج قیمت‌ها
  const prices = data.map(d => d.close);
  
  // 4. تولید سیگنال
  const signals = smaStrategy(prices, 5, 20);
  
  // 5. اجرای بک‌تست
  const report = runBacktest(prices, signals, {
    initialCapital: 100_000_000,
    commissionPct: 0.0004,
    stopLossPct: 5,
    takeProfitPct: 10
  });
  
  return {
    ...report,
    dataQuality: {
      outliersRemoved: validation.issues.length,
      isValid: validation.isValid
    }
  };
}
```

---

## 📈 شاخص‌های عملکرد

| معیار | مقدار |
|-------|-------|
| تعداد فایل‌های جدید | ۳ |
| تعداد توابع/کلاس‌ها | ۱۵+ |
| تعداد تست‌های واحد | ۳۴ |
| پوشش TypeScript | ۱۰۰٪ |
| خطاهای TypeScript | ۰ |

---

## 🎯 اهداف محقق شده فاز ۱

- ✅ **لایه کشینگ هوشمند**: موجود و تکمیل شد
- ✅ **اعتبارسنجی داده‌ها**: پیاده‌سازی کامل با ۳ روش تشخیص Outlier
- ✅ **مدیریت خطای شبکه**: Retry خودکار + Circuit Breaker + Network Monitor
- ✅ **آزمون‌های جامع**: ۳۴ تست واحد برای اطمینان از صحت عملکرد
- ✅ **TypeScript کامل**: بدون خطای type checking

---

## 🚀 آماده برای فاز ۲

زیرساخت داده اکنون آماده است برای:
- اجرای بک‌تست روی داده‌های تمیز و معتبر
- محاسبه دقیق شاخص‌های عملکرد
- امتیازدهی به سیگنال‌ها بر اساس کیفیت داده

---

## 📝 مستندات مرتبط

- [ROADMAP.md](./ROADMAP.md) - نقشه راه کامل پروژه
- [PHASE2_SUMMARY.md](./PHASE2_SUMMARY.md) - خلاصه فاز ۲
- [README.md](./README.md) - راهنمای اصلی پروژه

---

**تاریخ تکمیل:** ۱۴۰۳/۰۶/۱۵  
**وضعیت:** ✅ تکمیل شده  
**نسخه:** 1.0.0-alpha
