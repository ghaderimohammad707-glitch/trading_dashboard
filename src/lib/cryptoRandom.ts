/**
 * Secure random ID generator using crypto API
 * جایگزین امن برای Math.random() که برای اهداف رمزنگاری مناسب نیست
 */

/**
 * تولید ID تصادفی امن با استفاده از crypto.getRandomValues
 * @param length طول رشته خروجی (پیش‌فرض: 12)
 */
export function generateSecureId(length: number = 12): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(Math.ceil(length / 2));
    crypto.getRandomValues(array);
    return Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, length);
  }
  
  // Fallback برای محیط‌های قدیمی (غیرامن - فقط برای سازگاری)
  console.warn('⚠️ crypto API not available, falling back to Math.random (not secure)');
  return `fallback-${Date.now()}-${Math.random().toString(36).substr(2, length - 8)}`;
}

/**
 * تولید UUID نسخه 4 استاندارد
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback برای محیط‌های قدیمی
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
