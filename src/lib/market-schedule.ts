// ساعات معاملات بورس تهران (به وقت تهران — UTC+3:30)
// شنبه تا چهارشنبه، ۹:۰۰ تا ۱۲:۳۰
const OPEN_DAYS = new Set(["Sat", "Sun", "Mon", "Tue", "Wed"]);

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Tehran",
  weekday: "short",
});

const clockFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Tehran",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export interface TehranTime {
  weekday: string;
  hour: number;
  minute: number;
}

export interface MarketSchedule {
  isOpen: boolean;
  label: string;
  detail: string;
  next: string;
}

export const MARKET_HOURS_LABEL = "شنبه تا چهارشنبه، ۹:۰۰ تا ۱۲:۳۰";

/** ساعت و روز جاری به وقت تهران */
export function getTehranTime(date = new Date()): TehranTime {
  const weekday = weekdayFormatter.format(date);
  const [hour, minute] = clockFormatter.format(date).split(":").map(Number);
  return { weekday, hour, minute };
}

/** وضعیت باز/بسته بودن بازار در لحظهٔ داده‌شده */
export function getMarketSchedule(date = new Date()): MarketSchedule {
  const { weekday, hour, minute } = getTehranTime(date);
  const now = hour * 60 + minute;
  const open = 9 * 60; // ۹:۰۰
  const close = 12 * 60 + 30; // ۱۲:۳۰
  const tradingDay = OPEN_DAYS.has(weekday);

  if (tradingDay && now >= open && now < close) {
    return {
      isOpen: true,
      label: "بازار باز است",
      detail: "معاملات در جریان است",
      next: "پایان معاملات ۱۲:۳۰",
    };
  }

  if (weekday === "Thu" || weekday === "Fri") {
    return {
      isOpen: false,
      label: "بازار بسته است",
      detail:
        weekday === "Fri" ? "جمعه — تعطیل رسمی بازار" : "پنجشنبه — بازار تعطیل است",
      next: "بازگشایی شنبه ۹:۰۰",
    };
  }

  if (now < open) {
    return {
      isOpen: false,
      label: "بازار بسته است",
      detail: "بازار ساعت ۹:۰۰ باز می‌شود",
      next: "بازگشایی امروز ۹:۰۰",
    };
  }

  return {
    isOpen: false,
    label: "بازار بسته است",
    detail: "معاملات امروز به پایان رسید",
    next: weekday === "Wed" ? "بازگشایی شنبه ۹:۰۰" : "بازگشایی فردا ۹:۰۰",
  };
}

/** ساعت تهران با ارقام فارسی */
export function formatTehranClock(date = new Date(), withSeconds = false): string {
  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran",
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
  }).format(date);
}

/** تاریخ تهران با ارقام فارسی */
export function formatTehranDate(date = new Date()): string {
  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}
