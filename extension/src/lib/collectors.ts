/**
 * Collector orchestrator and individual collector implementations
 */

import type { CollectorConfig, CollectorResult } from '@/types';
import pako from 'pako';

/**
 * Run all enabled collectors and return results
 */
export async function runCollectors(
  tabId: number,
  url: string,
  config: CollectorConfig
): Promise<CollectorResult[]> {
  const results: CollectorResult[] = [];
  const collectorPromises: Promise<CollectorResult | null>[] = [];

  if (config.har) {
    collectorPromises.push(collectHAR(tabId, url));
  }
  if (config.console) {
    collectorPromises.push(collectConsole(tabId));
  }
  if (config.cookies) {
    collectorPromises.push(collectCookies(url));
  }
  if (config.dom) {
    collectorPromises.push(collectDOM(tabId));
  }
  if (config.memory) {
    collectorPromises.push(collectMemory(tabId));
  }
  if (config.performance) {
    collectorPromises.push(collectPerformance(tabId));
  }
  if (config.screenshot) {
    collectorPromises.push(collectScreenshot(tabId));
  }
  if (config.screenRecording) {
    collectorPromises.push(collectScreenRecording(tabId));
  }

  const settled = await Promise.allSettled(collectorPromises);

  for (const result of settled) {
    if (result.status === 'fulfilled' && result.value) {
      results.push(result.value);
    } else if (result.status === 'rejected') {
      console.error('Collector failed:', result.reason);
    }
  }

  return results;
}

/**
 * Collect HAR (HTTP Archive) - simplified version using Resource Timing API
 */
async function collectHAR(tabId: number, url: string): Promise<CollectorResult | null> {
  try {
    // Use chrome.debugger for full HAR collection
    // This is a simplified implementation - full HAR requires debugger protocol
    const har = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const entries = performance.getEntriesByType('resource');
        const navigation = performance.getEntriesByType('navigation')[0];

        return {
          log: {
            version: '1.2',
            creator: { name: 'DevaDoot', version: '1.0.0' },
            pages: [{
              startedDateTime: new Date().toISOString(),
              id: 'page_1',
              title: document.title,
              pageTimings: {
                onContentLoad: navigation ? (navigation as any).domContentLoadedEventEnd : -1,
                onLoad: navigation ? (navigation as any).loadEventEnd : -1,
              },
            }],
            entries: entries.map((entry: any) => ({
              startedDateTime: new Date(performance.timeOrigin + entry.startTime).toISOString(),
              time: entry.duration,
              request: {
                method: 'GET',
                url: entry.name,
                httpVersion: 'HTTP/1.1',
                headers: [],
                queryString: [],
                headersSize: -1,
                bodySize: -1,
              },
              response: {
                status: 200,
                statusText: 'OK',
                httpVersion: 'HTTP/1.1',
                headers: [],
                content: {
                  size: entry.transferSize || 0,
                  mimeType: '',
                },
                redirectURL: '',
                headersSize: -1,
                bodySize: entry.transferSize || 0,
              },
              cache: {},
              timings: {
                send: 0,
                wait: entry.responseStart - entry.requestStart,
                receive: entry.responseEnd - entry.responseStart,
              },
            })),
          },
        };
      },
    });

    if (har[0]?.result) {
      return {
        kind: 'har',
        data: JSON.stringify(har[0].result, null, 2),
        filename: 'har.json',
      };
    }

    return null;
  } catch (error) {
    console.error('HAR collection failed:', error);
    return null;
  }
}

/**
 * Collect console logs
 */
async function collectConsole(tabId: number): Promise<CollectorResult | null> {
  try {
    const logs = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // Check if console logs were buffered
        return (window as any).__devadoot_console_logs || [];
      },
    });

    if (logs[0]?.result && logs[0].result.length > 0) {
      const logLines = logs[0].result.map((log: any) =>
        JSON.stringify(log)
      ).join('\n');

      return {
        kind: 'console',
        data: logLines,
        filename: 'console.jsonl',
      };
    }

    return null;
  } catch (error) {
    console.error('Console collection failed:', error);
    return null;
  }
}

/**
 * Collect cookies
 */
async function collectCookies(url: string): Promise<CollectorResult | null> {
  try {
    const cookies = await chrome.cookies.getAll({ url });

    // Mask sensitive cookie values
    const sanitized = cookies.map(cookie => ({
      ...cookie,
      value: cookie.name.toLowerCase().includes('session') ||
             cookie.name.toLowerCase().includes('token') ||
             cookie.name.toLowerCase().includes('auth')
        ? '[REDACTED]'
        : cookie.value,
    }));

    return {
      kind: 'cookies',
      data: JSON.stringify(sanitized, null, 2),
      filename: 'cookies.json',
    };
  } catch (error) {
    console.error('Cookie collection failed:', error);
    return null;
  }
}

/**
 * Collect DOM snapshot
 */
async function collectDOM(tabId: number): Promise<CollectorResult | null> {
  try {
    const dom = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // Clone the document and remove scripts/styles
        const clone = document.documentElement.cloneNode(true) as HTMLElement;

        // Remove script and style tags
        const scripts = clone.getElementsByTagName('script');
        while (scripts.length > 0) {
          scripts[0].parentNode?.removeChild(scripts[0]);
        }

        const styles = clone.getElementsByTagName('style');
        while (styles.length > 0) {
          styles[0].parentNode?.removeChild(styles[0]);
        }

        return clone.outerHTML;
      },
    });

    if (dom[0]?.result) {
      // Compress the HTML
      const compressed = pako.gzip(dom[0].result);
      const blob = new Blob([compressed], { type: 'application/gzip' });

      return {
        kind: 'dom',
        data: blob,
        filename: 'dom.html.gz',
      };
    }

    return null;
  } catch (error) {
    console.error('DOM collection failed:', error);
    return null;
  }
}

/**
 * Collect memory information
 */
async function collectMemory(tabId: number): Promise<CollectorResult | null> {
  try {
    const memory = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const perf = performance as any;
        if (perf.memory) {
          return {
            usedJSHeapSize: perf.memory.usedJSHeapSize,
            totalJSHeapSize: perf.memory.totalJSHeapSize,
            jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
            timestamp: Date.now(),
          };
        }
        return null;
      },
    });

    if (memory[0]?.result) {
      return {
        kind: 'memory',
        data: JSON.stringify(memory[0].result, null, 2),
        filename: 'memory.json',
      };
    }

    return null;
  } catch (error) {
    console.error('Memory collection failed:', error);
    return null;
  }
}

/**
 * Collect performance metrics
 */
async function collectPerformance(tabId: number): Promise<CollectorResult | null> {
  try {
    const perf = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const navigation = performance.getEntriesByType('navigation')[0] as any;
        const paint = performance.getEntriesByType('paint');

        return {
          navigation: navigation ? {
            domContentLoaded: navigation.domContentLoadedEventEnd,
            loadComplete: navigation.loadEventEnd,
            fetchStart: navigation.fetchStart,
            responseEnd: navigation.responseEnd,
            domInteractive: navigation.domInteractive,
          } : null,
          paint: paint.map((entry: any) => ({
            name: entry.name,
            startTime: entry.startTime,
          })),
          timestamp: Date.now(),
        };
      },
    });

    if (perf[0]?.result) {
      return {
        kind: 'performance',
        data: JSON.stringify(perf[0].result, null, 2),
        filename: 'perf.json',
      };
    }

    return null;
  } catch (error) {
    console.error('Performance collection failed:', error);
    return null;
  }
}

/**
 * Collect screenshot
 */
async function collectScreenshot(tabId: number): Promise<CollectorResult | null> {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(undefined, {
      format: 'png',
    });

    // Convert data URL to Blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    return {
      kind: 'screenshot',
      data: blob,
      filename: 'screenshot.png',
    };
  } catch (error) {
    console.error('Screenshot collection failed:', error);
    return null;
  }
}

/**
 * Collect screen recording
 * Note: This requires user interaction and is complex to implement
 */
async function collectScreenRecording(tabId: number): Promise<CollectorResult | null> {
  try {
    // Screen recording requires tabCapture API and user consent
    // This is a placeholder for the full implementation
    console.warn('Screen recording collection not fully implemented');
    return null;
  } catch (error) {
    console.error('Screen recording collection failed:', error);
    return null;
  }
}
