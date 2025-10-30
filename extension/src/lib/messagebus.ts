/**
 * Message bus utilities for chrome.runtime messaging
 */

import type { BaseMessage } from '@/types';

/**
 * Send a message to the background script
 */
export async function sendToBackground<T extends BaseMessage>(
  message: T
): Promise<any> {
  try {
    return await chrome.runtime.sendMessage(message);
  } catch (error) {
    console.error('Error sending message to background:', error);
    throw error;
  }
}

/**
 * Send a message to a specific tab
 */
export async function sendToTab<T extends BaseMessage>(
  tabId: number,
  message: T
): Promise<any> {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    console.error(`Error sending message to tab ${tabId}:`, error);
    throw error;
  }
}

/**
 * Send a message to all tabs
 */
export async function broadcastToTabs<T extends BaseMessage>(
  message: T
): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({});
    await Promise.all(
      tabs.map(tab => {
        if (tab.id) {
          return sendToTab(tab.id, message).catch(() => {
            // Ignore errors for tabs that can't receive messages
          });
        }
      })
    );
  } catch (error) {
    console.error('Error broadcasting to tabs:', error);
  }
}

/**
 * Listen for messages with type safety
 */
export function onMessage<T extends BaseMessage>(
  callback: (message: T, sender: chrome.runtime.MessageSender) => void | Promise<any>
): void {
  chrome.runtime.onMessage.addListener(
    (message: T, sender, sendResponse) => {
      const result = callback(message, sender);

      // Handle async responses
      if (result instanceof Promise) {
        result.then(sendResponse).catch(error => {
          console.error('Error in message handler:', error);
          sendResponse({ error: error.message });
        });
        return true; // Keep channel open for async response
      }

      return false;
    }
  );
}

/**
 * Create a typed message listener with filtering by message type
 */
export function onMessageType<T extends BaseMessage>(
  type: T['type'],
  callback: (message: T, sender: chrome.runtime.MessageSender) => void | Promise<any>
): void {
  onMessage<T>((message, sender) => {
    if (message.type === type) {
      return callback(message, sender);
    }
  });
}
