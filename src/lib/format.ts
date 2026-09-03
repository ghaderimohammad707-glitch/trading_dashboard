const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** تبدیل ارقام لاتین به فارسی */
export function toFa(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/** عدد با تعداد اعشار دقیق و ارقام فارسی */
export function faNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat("fa-IR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** عدد با حداکثر اعشار مشخص (اعداد صحیح بدون اعشار) */
export function faRound(value: number, maxDecimals = 1): string {
  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

/** عدد علامت‌دار (برای نمایش در سلول‌های LTR) */
export function faSigned(value: number, decimals = 2): string {
  const sign = value < 0 ? "-" : "";
  return sign + faNumber(Math.abs(value), decimals);
}

/** درصد فارسی */
export function faPercent(value: number, decimals = 2): string {
  return faNumber(value, decimals) + "٪";
}

/** فشرده‌سازی عدد (هزار، میلیون، میلیارد، هزار میلیارد) */
export function compactNumber(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e12) return sign + faRound(abs / 1e12, 1) + " هزار میلیارد";
  if (abs >= 1e9) return sign + faRound(abs / 1e9, 1) + " میلیارد";
  if (abs >= 1e6) return sign + faRound(abs / 1e6, 1) + " میلیون";
  if (abs >= 1e3) return sign + faRound(abs / 1e3, 1) + " هزار";
  return sign + faNumber(abs);
}

/** فشرده‌سازی مبالغ تومانی (همت = هزار میلیارد تومان) */
export function compactToman(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e12) return sign + faRound(abs / 1e12, 1) + " همت";
  if (abs >= 1e9) return sign + faRound(abs / 1e9, 1) + " میلیارد";
  if (abs >= 1e6) return sign + faRound(abs / 1e6, 1) + " میلیون";
  return sign + faNumber(abs);
}

/** قیمت به همراه واحد */
export function faPrice(value: number, unit?: string, decimals = 0): string {
  const amount = faNumber(value, decimals);
  return unit ? `${amount} ${unit}` : amount;
}
