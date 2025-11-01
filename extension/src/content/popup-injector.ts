/**
 * Popup Injector
 * Injects the chat popup iframe into the page
 */

import { onMessageType } from '@/lib/messagebus';
import type { InjectPopupMessage } from '@/types';

let popupIframe: HTMLIFrameElement | null = null;
let minimized = false;

console.log('DevaDoot Popup Injector loaded');

/**
 * Create and inject popup iframe
 */
function createPopup(data: InjectPopupMessage) {
  console.log('[POPUP INJECTOR] createPopup called with data:', data);

  // Remove existing popup if any
  if (popupIframe) {
    console.log('[POPUP INJECTOR] Removing existing popup');
    popupIframe.remove();
  }

  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'devadoot-popup';
  const popupUrl = chrome.runtime.getURL('popup/index.html');
  console.log('[POPUP INJECTOR] Popup URL:', popupUrl);
  iframe.src = popupUrl;

  // Style the iframe
  Object.assign(iframe.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '400px',
    height: '600px',
    border: 'none',
    borderRadius: '12px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
    zIndex: '2147483647', // Max z-index
    backgroundColor: 'white',
    transition: 'all 0.3s ease',
  });

  // Inject into page
  console.log('[POPUP INJECTOR] Appending iframe to body');
  document.body.appendChild(iframe);
  popupIframe = iframe;

  // Send data to popup after it loads
  iframe.addEventListener('load', () => {
    console.log('[POPUP INJECTOR] Iframe loaded, sending init message');
    iframe.contentWindow?.postMessage(
      {
        type: 'init',
        data: {
          caseId: data.caseId,
          welcomeMessage: data.welcome,
          agentName: data.agentName,
          chatMeta: data.chatMeta,
        },
      },
      '*'
    );
  });

  console.log('[POPUP INJECTOR] ✓ Popup iframe created and injected for case:', data.caseId);
}

/**
 * Minimize popup
 */
function minimizePopup() {
  if (!popupIframe) return;

  minimized = true;

  Object.assign(popupIframe.style, {
    width: '80px',
    height: '80px',
    borderRadius: '40px',
  });

  // Send minimize event to popup
  popupIframe.contentWindow?.postMessage({ type: 'minimize' }, '*');
}

/**
 * Restore popup
 */
function restorePopup() {
  if (!popupIframe) return;

  minimized = false;

  Object.assign(popupIframe.style, {
    width: '400px',
    height: '600px',
    borderRadius: '12px',
  });

  // Send restore event to popup
  popupIframe.contentWindow?.postMessage({ type: 'restore' }, '*');
}

/**
 * Remove popup
 */
function removePopup() {
  if (popupIframe) {
    popupIframe.remove();
    popupIframe = null;
  }

  minimized = false;
  console.log('Popup removed');
}

/**
 * Listen for popup messages from iframe
 */
window.addEventListener('message', (event) => {
  // Only accept messages from our iframe
  if (event.source !== popupIframe?.contentWindow) {
    return;
  }

  const { type } = event.data;

  switch (type) {
    case 'minimize':
      minimizePopup();
      break;

    case 'restore':
      restorePopup();
      break;

    case 'close':
      removePopup();
      chrome.runtime.sendMessage({
        type: 'popup-close',
        caseId: event.data.caseId,
      });
      break;

    case 'end-support':
      removePopup();
      chrome.runtime.sendMessage({
        type: 'popup-end-support',
        caseId: event.data.caseId,
      });
      break;

    case 'send-message':
      // Forward chat messages to background
      chrome.runtime.sendMessage({
        type: 'send-chat-message',
        caseId: event.data.caseId,
        message: event.data.message,
      });
      break;
  }
});

/**
 * Listen for inject-popup message from background
 */
onMessageType<InjectPopupMessage>('inject-popup', (message) => {
  console.log('[POPUP INJECTOR] Received inject-popup message:', message);
  createPopup(message);
});

// Make popup toggleable by clicking on minimized version
document.addEventListener('click', (event) => {
  if (minimized && popupIframe && event.target === popupIframe) {
    restorePopup();
  }
});
