/**
 * Debounce utility for rate-limiting function calls
 */

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle utility for ensuring function is called at most once per period
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Rate limiter that queues calls and processes them at a specified rate
 */
export class RateLimiter {
  private queue: Array<() => void> = [];
  private processing = false;
  private readonly interval: number;
  private readonly maxPerInterval: number;

  constructor(maxPerInterval: number, intervalMs: number) {
    this.maxPerInterval = maxPerInterval;
    this.interval = intervalMs;
  }

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    const batch = this.queue.splice(0, this.maxPerInterval);

    // Process batch
    await Promise.all(batch.map(fn => fn()));

    // Wait before processing next batch
    setTimeout(() => {
      this.processing = false;
      this.process();
    }, this.interval);
  }
}
