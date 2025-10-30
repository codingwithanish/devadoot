/**
 * Rule validation and schema utilities
 */

import type { AgentConfig } from '@/types';

/**
 * Validate agent configuration
 */
export function validateAgentConfig(config: Partial<AgentConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.name || config.name.trim().length === 0) {
    errors.push('Agent name is required');
  }

  if (!config.sites || config.sites.length === 0) {
    errors.push('At least one site must be specified');
  }

  if (!config.monitoring) {
    errors.push('Monitoring type is required');
  }

  if (!config.ruleNL || config.ruleNL.trim().length === 0) {
    errors.push('Agent invocation rule is required');
  }

  if (!config.source) {
    errors.push('Agent source (marketplace/custom) is required');
  }

  if (config.source === 'marketplace' && !config.marketplaceId) {
    errors.push('Marketplace agent selection is required');
  }

  if (config.source === 'custom' && !config.customEndpoint) {
    errors.push('Custom agent URL is required');
  }

  if (config.customEndpoint) {
    try {
      const url = new URL(config.customEndpoint);
      if (!['http:', 'https:', 'wss:', 'ws:'].includes(url.protocol)) {
        errors.push('Custom agent URL must use HTTP, HTTPS, WS, or WSS protocol');
      }
    } catch {
      errors.push('Custom agent URL is not a valid URL');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate URL pattern (regex)
 */
export function validateUrlPattern(pattern: string): {
  valid: boolean;
  error?: string;
} {
  try {
    new RegExp(pattern);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid regex pattern',
    };
  }
}

/**
 * Check if a URL matches any of the configured sites or patterns
 */
export function matchesAgentConfig(
  url: string,
  config: AgentConfig
): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Check exact site matches
    for (const site of config.sites) {
      if (hostname === site || hostname.endsWith('.' + site)) {
        return true;
      }
    }

    // Check URL pattern matches
    for (const pattern of config.urlPatterns) {
      try {
        const regex = new RegExp(pattern);
        if (regex.test(url)) {
          return true;
        }
      } catch {
        // Invalid regex, skip
        continue;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Extract readable text from HTML nodes
 */
export function extractReadableText(node: Node, maxLength = 1000): string {
  const text: string[] = [];
  const walker = document.createTreeWalker(
    node,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Skip script and style elements
        const parent = node.parentElement;
        if (
          parent?.tagName === 'SCRIPT' ||
          parent?.tagName === 'STYLE' ||
          parent?.tagName === 'NOSCRIPT'
        ) {
          return NodeFilter.FILTER_REJECT;
        }

        // Only include text with actual content
        const content = node.textContent?.trim();
        if (content && content.length > 0) {
          return NodeFilter.FILTER_ACCEPT;
        }

        return NodeFilter.FILTER_REJECT;
      },
    }
  );

  let totalLength = 0;
  let currentNode: Node | null;

  while ((currentNode = walker.nextNode()) !== null) {
    const content = currentNode.textContent?.trim();
    if (content) {
      text.push(content);
      totalLength += content.length;

      if (totalLength >= maxLength) {
        break;
      }
    }
  }

  return text.join(' ').substring(0, maxLength);
}

/**
 * Sanitize and truncate text sample
 */
export function sanitizeSample(text: string, maxLength = 2000): string {
  // Remove excessive whitespace
  let sanitized = text.replace(/\s+/g, ' ').trim();

  // Truncate if needed
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...';
  }

  return sanitized;
}
