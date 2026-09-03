/**
 * صف درخواست‌ها — مدیریت درخواست‌های شبکه
 * حداکثر ۱ درخواست همزمان، فاصله ۷۰۰ms، timeout ۱۰s، retry ۲ بار
 */

interface QueueItem {
  id: string;
  url: string;
  options?: RequestInit;
  timeoutMs: number;
  maxRetries: number;
  resolve: (data: string) => void;
  reject: (error: Error) => void;
}

const CONCURRENCY = 1;
const DELAY_MS = 700;
const DEFAULT_TIMEOUT = 10_000;
const DEFAULT_RETRIES = 2;
const RETRY_DELAY = 3_000;

let _queue: QueueItem[] = [];
let _running = 0;
let _lastRequestTime = 0;

function processQueue() {
  if (_running >= CONCURRENCY || _queue.length === 0) return;

  const now = Date.now();
  const timeSinceLast = now - _lastRequestTime;
  if (timeSinceLast < DELAY_MS && _lastRequestTime > 0) {
    setTimeout(processQueue, DELAY_MS - timeSinceLast);
    return;
  }

  const item = _queue.shift();
  if (!item) return;

  _running++;
  _lastRequestTime = Date.now();

  executeWithRetry(item)
    .then((data) => item.resolve(data))
    .catch((err) => item.reject(err))
    .finally(() => {
      _running--;
      // Process next item after delay
      setTimeout(processQueue, DELAY_MS);
    });
}

async function executeWithRetry(item: QueueItem, attempt = 0): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), item.timeoutMs);

  try {
    const mergedOptions: RequestInit = {
      ...item.options,
      signal: controller.signal,
    };

    const res = await fetch(item.url, mergedOptions);
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const text = await res.text();
    if (!text.startsWith("{") && !text.startsWith("[")) {
      throw new Error("Response is not JSON");
    }

    return text;
  } catch (err) {
    clearTimeout(timeoutId);

    if (attempt < item.maxRetries) {
      console.warn(`[requestQueue] Retry ${attempt + 1}/${item.maxRetries} for ${item.id}`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
      return executeWithRetry(item, attempt + 1);
    }

    throw err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * افزودن درخواست به صف
 */
export function enqueueRequest(
  id: string,
  url: string,
  options?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT,
  maxRetries = DEFAULT_RETRIES,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    _queue.push({ id, url, options, timeoutMs, maxRetries, resolve, reject });
    processQueue();
  });
}

/**
 * وضعیت صف
 */
export function getQueueStatus() {
  return {
    pending: _queue.length,
    running: _running,
  };
}

/**
 * پاک کردن صف
 */
export function clearQueue() {
  _queue = [];
}
