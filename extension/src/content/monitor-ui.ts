/**
 * UI Monitor Content Script
 * Monitors DOM changes using MutationObserver
 */

import { debounce } from '@/lib/debounce';
import { extractReadableText, sanitizeSample } from '@/lib/rules';
import { sendToBackground, onMessageType } from '@/lib/messagebus';
import type { StartMonitorMessage, AgentMatch } from '@/types';

let activeObserver: MutationObserver | null = null;
let currentAgent: AgentMatch | null = null;
let monitoringEnabled = false;

// Buffer for detected changes
const changeBuffer: string[] = [];

console.log('DevaDoot UI Monitor loaded');

/**
 * Start UI monitoring for an agent
 */
function startMonitoring(agent: AgentMatch) {
  if (agent.monitoring !== 'UI' && agent.monitoring !== 'Both') {
    return;
  }

  console.log('Starting UI monitoring for agent:', agent.name);

  currentAgent = agent;
  monitoringEnabled = true;

  // Stop existing observer if any
  if (activeObserver) {
    activeObserver.disconnect();
  }

  // Find the best container to observe
  const container = findAppContainer();

  // Create mutation observer
  activeObserver = new MutationObserver(
    debounce((mutations: MutationRecord[]) => {
      if (!monitoringEnabled || !currentAgent) {
        return;
      }

      handleMutations(mutations);
    }, 250) // 250ms debounce
  );

  // Start observing
  activeObserver.observe(container, {
    childList: true,
    characterData: true,
    subtree: true,
  });

  console.log('UI monitoring active on:', container.tagName);
}

/**
 * Stop UI monitoring
 */
function stopMonitoring() {
  console.log('Stopping UI monitoring');

  monitoringEnabled = false;

  if (activeObserver) {
    activeObserver.disconnect();
    activeObserver = null;
  }

  currentAgent = null;
  changeBuffer.length = 0;
}

/**
 * Find the best container to observe (prefer app root over body)
 */
function findAppContainer(): HTMLElement {
  // Common SPA root selectors
  const selectors = [
    '#root',
    '#app',
    '#__next',
    '[data-reactroot]',
    '[data-vueapp]',
    'main',
    '#content',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element instanceof HTMLElement) {
      return element;
    }
  }

  // Fallback to body
  return document.body;
}

/**
 * Handle mutation events
 */
function handleMutations(mutations: MutationRecord[]) {
  const addedText: string[] = [];

  for (const mutation of mutations) {
    // Handle added nodes
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
          const text = extractReadableText(node, 500);
          if (text.length > 10) {
            addedText.push(text);
          }
        }
      }
    }

    // Handle character data changes
    if (mutation.type === 'characterData' && mutation.target.textContent) {
      const text = mutation.target.textContent.trim();
      if (text.length > 10) {
        addedText.push(text);
      }
    }
  }

  if (addedText.length > 0) {
    const combined = addedText.join(' ');
    changeBuffer.push(combined);

    // If buffer is getting large, send sample
    if (changeBuffer.length >= 5) {
      sendSample();
    }
  }
}

/**
 * Send UI sample to background script
 */
async function sendSample() {
  if (!currentAgent || changeBuffer.length === 0) {
    return;
  }

  const textSample = sanitizeSample(changeBuffer.join(' '), 2000);
  changeBuffer.length = 0;

  console.log('Sending UI sample:', textSample.substring(0, 100));

  try {
    await sendToBackground({
      type: 'ui-sample',
      payload: {
        agentId: currentAgent.agentId,
        textSample,
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
    console.error('Error sending UI sample:', error);
  }
}

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
