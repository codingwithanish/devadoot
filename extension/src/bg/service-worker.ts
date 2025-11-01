/**
 * Background Service Worker
 * Handles tab navigation, agent matching, rule evaluation, and collector orchestration
 */

import { apiClient } from './api-client';
import { runCollectors } from '@/lib/collectors';
import { onMessage, sendToTab } from '@/lib/messagebus';
import type {
  TabState,
  UISampleMessage,
  APISampleMessage,
  PopupControlMessage,
} from '@/types';

// Tab state management
const tabStates = new Map<number, TabState>();
const activeCases = new Map<number, string>(); // tabId -> caseId

// Initialize API client
apiClient.init();

console.log('DevaDoot Background Service Worker initialized');

/**
 * Listen for storage changes to reinitialize API client
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync') {
    // Check if mode, serverUrl, or authToken changed
    if (changes.mode || changes.serverUrl || changes.authToken) {
      console.log('Storage settings changed, reinitializing API client...');
      apiClient.init();
    }
  }
});

/**
 * Handle tab updates (navigation)
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  console.log(`[SERVICE WORKER] Tab ${tabId} updated - status: ${changeInfo.status}, url: ${tab.url}`);

  if (changeInfo.status !== 'complete' || !tab.url) {
    return;
  }

  // Don't monitor chrome:// or extension pages
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
    console.log(`[SERVICE WORKER] Skipping chrome:// or extension page: ${tab.url}`);
    return;
  }

  try {
    console.log(`[SERVICE WORKER] Tab ${tabId} navigated to: ${tab.url}`);

    // Reset icon to gray
    await setIconColor(tabId, 'gray');

    // Notify backend of visit and get matching agents
    console.log(`[SERVICE WORKER] Calling apiClient.postVisit for: ${tab.url}`);
    const response = await apiClient.postVisit({
      url: tab.url,
      tabId,
    });

    console.log(`[SERVICE WORKER] apiClient.postVisit returned:`, response);

    if (response.matches && response.matches.length > 0) {
      console.log(`[SERVICE WORKER] ✓ Found ${response.matches.length} matching agents for ${tab.url}`);

      // Update tab state
      tabStates.set(tabId, {
        url: tab.url,
        activeAgents: response.matches,
        monitoring: true,
      });

      // Start monitoring by sending config to content scripts
      for (const match of response.matches) {
        console.log(`[SERVICE WORKER] Sending start-monitor message for agent: ${match.name}`);
        await sendToTab(tabId, {
          type: 'start-monitor',
          match,
        });
      }
    } else {
      console.log(`[SERVICE WORKER] No matching agents for ${tab.url}`);
      tabStates.delete(tabId);
    }
  } catch (error) {
    console.error('[SERVICE WORKER] Error handling tab update:', error);
  }
});

/**
 * Handle tab removal
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  tabStates.delete(tabId);
  activeCases.delete(tabId);
});

/**
 * Handle messages from content scripts and popup
 */
onMessage(async (message, sender) => {
  const tabId = sender.tab?.id;

  if (!tabId) {
    return;
  }

  try {
    switch (message.type) {
      case 'ui-sample':
        await handleUISample(message as UISampleMessage, tabId);
        break;

      case 'api-sample':
        await handleAPISample(message as APISampleMessage, tabId);
        break;

      case 'popup-minimize':
        console.log(`Popup minimized for case ${(message as PopupControlMessage).caseId}`);
        break;

      case 'popup-close':
        await handlePopupClose(message as PopupControlMessage, tabId);
        break;

      case 'popup-end-support':
        await handleEndSupport(message as PopupControlMessage, tabId);
        break;

      default:
        console.warn('Unknown message type:', message.type);
    }
  } catch (error) {
    console.error('Error handling message:', error);
  }
});

/**
 * Handle UI sample from content script
 */
async function handleUISample(message: UISampleMessage, tabId: number) {
  const { payload, caseInit, welcome, chatMeta, collectors } = message;

  console.log('[SERVICE WORKER] Received UI sample from tab:', tabId);
  console.log('[SERVICE WORKER] Sample preview:', payload.textSample.substring(0, 100));

  try {
    // Evaluate rule on backend
    console.log('[SERVICE WORKER] Evaluating rule for agent:', payload.agentId);
    const evaluation = await apiClient.evaluateUIRule({
      agentId: payload.agentId,
      textSample: payload.textSample,
      ruleNL: caseInit.ruleSnapshot.nl,
      ruleStructured: caseInit.ruleSnapshot.structured,
      url: payload.url,
    });

    console.log('[SERVICE WORKER] Rule evaluation result:', evaluation);

    if (!evaluation.match) {
      console.log('[SERVICE WORKER] Rule did not match. Score:', evaluation.score);
      return;
    }

    console.log('[SERVICE WORKER] ✓ Rule matched! Creating case...');

    // Create case
    const { caseId } = await apiClient.createCase(caseInit);
    console.log(`[SERVICE WORKER] Case created: ${caseId}`);

    // Store case ID
    activeCases.set(tabId, caseId);

    // Update tab state
    const tabState = tabStates.get(tabId);
    if (tabState) {
      tabState.caseId = caseId;
    }

    // Set icon to green
    console.log('[SERVICE WORKER] Setting icon to green');
    await setIconColor(tabId, 'green');

    // Run collectors and upload
    console.log('[SERVICE WORKER] Running collectors...');
    await runCollectorsAndUpload(caseId, tabId, payload.url, collectors);

    // Inject popup
    console.log('[SERVICE WORKER] Injecting popup with welcome:', welcome);
    await injectPopup(tabId, {
      caseId,
      welcome,
      chatMeta,
      agentName: caseInit.agentId,
    });

    console.log('[SERVICE WORKER] ✓ Popup injection complete!');
  } catch (error) {
    console.error('[SERVICE WORKER] Error handling UI sample:', error);
  }
}

/**
 * Handle API sample from content script
 */
async function handleAPISample(message: APISampleMessage, tabId: number) {
  const { payload, caseInit, welcome, chatMeta, collectors } = message;

  console.log('Evaluating API sample:', payload.summary.url);

  try {
    // Evaluate rule on backend
    const evaluation = await apiClient.evaluateAPIRule({
      agentId: payload.agentId,
      request: {
        method: payload.summary.method,
        url: payload.summary.url,
        bodySnippet: payload.summary.bodySnippet,
      },
      response: {
        status: payload.summary.status || 0,
        bodySnippet: '',
      },
      ruleNL: caseInit.ruleSnapshot.nl,
      ruleStructured: caseInit.ruleSnapshot.structured,
      url: payload.url,
    });

    if (!evaluation.match) {
      console.log('Rule did not match. Score:', evaluation.score);
      return;
    }

    console.log('Rule matched! Creating case...');

    // Create case
    const { caseId } = await apiClient.createCase(caseInit);
    console.log(`Case created: ${caseId}`);

    // Store case ID
    activeCases.set(tabId, caseId);

    // Update tab state
    const tabState = tabStates.get(tabId);
    if (tabState) {
      tabState.caseId = caseId;
    }

    // Set icon to green
    await setIconColor(tabId, 'green');

    // Run collectors and upload
    await runCollectorsAndUpload(caseId, tabId, payload.url, collectors);

    // Inject popup
    await injectPopup(tabId, {
      caseId,
      welcome,
      chatMeta,
      agentName: caseInit.ruleSnapshot.nl,
    });
  } catch (error) {
    console.error('Error handling API sample:', error);
  }
}

/**
 * Handle popup close
 */
async function handlePopupClose(message: PopupControlMessage, tabId: number) {
  console.log(`Closing popup for case ${message.caseId}`);
  activeCases.delete(tabId);

  // Reset icon to gray
  await setIconColor(tabId, 'gray');
}

/**
 * Handle end support
 */
async function handleEndSupport(message: PopupControlMessage, tabId: number) {
  console.log(`Ending support for case ${message.caseId}`);

  try {
    // Close case on backend
    await apiClient.closeCase(message.caseId);
    console.log(`Case ${message.caseId} closed on backend`);
  } catch (error) {
    console.error('Error closing case:', error);
  }

  activeCases.delete(tabId);

  // Reset icon to gray
  await setIconColor(tabId, 'gray');
}

/**
 * Run collectors and upload artifacts
 */
async function runCollectorsAndUpload(
  caseId: string,
  tabId: number,
  url: string,
  collectors: any
) {
  console.log('Running collectors...');

  try {
    const results = await runCollectors(tabId, url, collectors);
    console.log(`Collected ${results.length} artifacts`);

    // Upload each artifact
    for (const result of results) {
      try {
        const uploaded = await apiClient.uploadArtifact(
          caseId,
          result.kind,
          result.data
        );
        console.log(`Uploaded ${result.kind}:`, uploaded.s3Key);
      } catch (error) {
        console.error(`Failed to upload ${result.kind}:`, error);
      }
    }
  } catch (error) {
    console.error('Error running collectors:', error);
  }
}

/**
 * Inject popup into page
 */
async function injectPopup(
  tabId: number,
  data: { caseId: string; welcome: string; chatMeta: any; agentName: string }
) {
  console.log('[SERVICE WORKER] injectPopup called for tab:', tabId);
  console.log('[SERVICE WORKER] Popup data:', data);

  try {
    // popup-injector.ts is already loaded as a content script
    // Just send the inject-popup message
    console.log('[SERVICE WORKER] Sending inject-popup message to content script...');
    await sendToTab(tabId, {
      type: 'inject-popup',
      ...data,
    });

    console.log('[SERVICE WORKER] inject-popup message sent!');
  } catch (error) {
    console.error('[SERVICE WORKER] Error injecting popup:', error);
  }
}

/**
 * Set extension icon color
 */
async function setIconColor(tabId: number, color: 'gray' | 'green') {
  try {
    await chrome.action.setIcon({
      tabId,
      path: {
        '16': `icons/${color}-16.png`,
        '32': `icons/${color}-32.png`,
        '48': `icons/${color}-48.png`,
        '128': `icons/${color}-128.png`,
      },
    });
  } catch (error) {
    console.error('Error setting icon color:', error);
  }
}
