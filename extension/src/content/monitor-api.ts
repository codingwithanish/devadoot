/**
 * API Monitor Content Script
 * Intercepts fetch and XMLHttpRequest calls
 */

import { throttle } from '@/lib/debounce';
import { sendToBackground, onMessageType } from '@/lib/messagebus';
import type { StartMonitorMessage, AgentMatch, APISummary } from '@/types';

let currentAgent: AgentMatch | null = null;
let monitoringEnabled = false;
let originalFetch: typeof fetch;
let originalXHROpen: typeof XMLHttpRequest.prototype.open;
let originalXHRSend: typeof XMLHttpRequest.prototype.send;

console.log('DevaDoot API Monitor loaded');

/**
 * Start API monitoring for an agent
 */
function startMonitoring(agent: AgentMatch) {
  if (agent.monitoring !== 'API' && agent.monitoring !== 'Both') {
    return;
  }

  console.log('Starting API monitoring for agent:', agent.name);

  currentAgent = agent;
  monitoringEnabled = true;

  // Install interceptors if not already installed
  if (!originalFetch) {
    installFetchInterceptor();
    installXHRInterceptor();
  }
}

/**
 * Stop API monitoring
 */
function stopMonitoring() {
  console.log('Stopping API monitoring');
  monitoringEnabled = false;
  currentAgent = null;
}

/**
 * Install fetch interceptor
 */
function installFetchInterceptor() {
  originalFetch = window.fetch;

  window.fetch = async function (...args: Parameters<typeof fetch>) {
    const startTime = performance.now();
    const [resource, init] = args;

    const url = typeof resource === 'string'
      ? resource
      : resource instanceof Request
        ? resource.url
        : resource.toString();
    const method = init?.method || 'GET';

    try {
      // Call original fetch
      const response = await originalFetch.apply(this, args);

      // Log if monitoring is enabled
      if (monitoringEnabled) {
        const duration = performance.now() - startTime;

        throttledSendAPISample({
          method,
          url,
          status: response.status,
          duration,
        });
      }

      return response;
    } catch (error) {
      // Log error
      if (monitoringEnabled) {
        throttledSendAPISample({
          method,
          url,
          status: 0,
          duration: performance.now() - startTime,
        });
      }

      throw error;
    }
  };
}

/**
 * Install XMLHttpRequest interceptor
 */
function installXHRInterceptor() {
  originalXHROpen = XMLHttpRequest.prototype.open;
  originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    ...rest: any[]
  ) {
    // Store request info
    (this as any).__devadoot = {
      method,
      url: url.toString(),
      startTime: performance.now(),
    };

    return originalXHROpen.apply(this, [method, url, ...rest] as any);
  };

  XMLHttpRequest.prototype.send = function (body?: XMLHttpRequestBodyInit | Document | null) {
    const xhr = this;
    const requestInfo = (xhr as any).__devadoot;

    if (requestInfo) {
      // Add load listener
      xhr.addEventListener('load', function () {
        if (monitoringEnabled) {
          const duration = performance.now() - requestInfo.startTime;

          throttledSendAPISample({
            method: requestInfo.method,
            url: requestInfo.url,
            status: xhr.status,
            duration,
          });
        }
      });

      // Add error listener
      xhr.addEventListener('error', function () {
        if (monitoringEnabled) {
          throttledSendAPISample({
            method: requestInfo.method,
            url: requestInfo.url,
            status: 0,
            duration: performance.now() - requestInfo.startTime,
          });
        }
      });
    }

    return originalXHRSend.apply(this, [body]);
  };
}

/**
 * Send API sample to background script (throttled)
 */
const throttledSendAPISample = throttle(
  async (summary: APISummary) => {
    if (!currentAgent) {
      return;
    }

    console.log('API activity:', summary.method, summary.url);

    // Only send if URL is not an extension URL
    if (summary.url.startsWith('chrome-extension://')) {
      return;
    }

    try {
      await sendToBackground({
        type: 'api-sample',
        payload: {
          agentId: currentAgent.agentId,
          summary,
          url: window.location.href,
        },
        caseInit: {
          agentId: currentAgent.agentId,
          url: window.location.href,
          site: window.location.hostname,
          ruleSnapshot: currentAgent.rule,
        },
        welcome: currentAgent.welcomeMessage,
        chatMeta: currentAgent.agentChatMeta,
        collectors: currentAgent.collectors,
      });
    } catch (error) {
      console.error('Error sending API sample:', error);
    }
  },
  1000 // Max 1 per second
);

/**
 * Listen for start/stop monitor messages
 */
onMessageType<StartMonitorMessage>('start-monitor', (message) => {
  startMonitoring(message.match);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  stopMonitoring();
});
