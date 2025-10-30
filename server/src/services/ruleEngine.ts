/**
 * Rule engine service
 * Evaluates natural language rules against UI/API samples
 */

import { logger } from '../utils/logger';

interface UIEvaluation {
  agentId: string;
  textSample: string;
  ruleNL: string;
  ruleStructured?: any;
  url: string;
}

interface APIEvaluation {
  agentId: string;
  request: {
    method: string;
    url: string;
    bodySnippet?: string;
  };
  response: {
    status: number;
    bodySnippet?: string;
  };
  ruleNL: string;
  ruleStructured?: any;
  url: string;
}

interface EvaluationResult {
  match: boolean;
  score: number;
  reason: string;
}

/**
 * Evaluate UI sample against rule
 */
export async function evaluateUI(params: UIEvaluation): Promise<EvaluationResult> {
  const { textSample, ruleNL, ruleStructured } = params;

  logger.debug({ agentId: params.agentId, ruleNL }, 'Evaluating UI rule');

  try {
    // Simple keyword-based matching
    // In production, this would use more sophisticated NLP or embeddings
    const keywords = extractKeywords(ruleNL);
    const sampleLower = textSample.toLowerCase();

    let matchCount = 0;
    for (const keyword of keywords) {
      if (sampleLower.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }

    // Check structured rule if available
    if (ruleStructured?.triggers) {
      const { keywords: structuredKeywords, conditions } = ruleStructured.triggers;

      if (structuredKeywords) {
        for (const keyword of structuredKeywords) {
          if (sampleLower.includes(keyword.toLowerCase())) {
            matchCount++;
          }
        }
      }

      // Check conditions
      if (conditions) {
        for (const condition of conditions) {
          if (evaluateCondition(condition, textSample)) {
            matchCount++;
          }
        }
      }
    }

    const score = Math.min(matchCount / Math.max(keywords.length, 1), 1.0);
    const match = score > 0.5;

    const reason = match
      ? `Found ${matchCount} matching keywords/conditions`
      : `Only ${matchCount} matches, insufficient for threshold`;

    logger.debug({ match, score, reason }, 'UI rule evaluation result');

    return { match, score, reason };
  } catch (error) {
    logger.error({ error }, 'Error evaluating UI rule');
    return { match: false, score: 0, reason: 'Evaluation error' };
  }
}

/**
 * Evaluate API sample against rule
 */
export async function evaluateAPI(params: APIEvaluation): Promise<EvaluationResult> {
  const { request, response, ruleNL, ruleStructured } = params;

  logger.debug({ agentId: params.agentId, ruleNL }, 'Evaluating API rule');

  try {
    const keywords = extractKeywords(ruleNL);
    let matchCount = 0;

    // Check URL
    const urlLower = request.url.toLowerCase();
    for (const keyword of keywords) {
      if (urlLower.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }

    // Check status code patterns
    if (ruleNL.includes('404') && response.status === 404) {
      matchCount += 2;
    }
    if (ruleNL.includes('error') && response.status >= 400) {
      matchCount += 2;
    }
    if (ruleNL.includes('500') && response.status >= 500) {
      matchCount += 2;
    }

    // Check method
    if (ruleNL.toLowerCase().includes(request.method.toLowerCase())) {
      matchCount++;
    }

    // Check body snippets
    if (request.bodySnippet) {
      const bodyLower = request.bodySnippet.toLowerCase();
      for (const keyword of keywords) {
        if (bodyLower.includes(keyword.toLowerCase())) {
          matchCount++;
        }
      }
    }

    if (response.bodySnippet) {
      const bodyLower = response.bodySnippet.toLowerCase();
      for (const keyword of keywords) {
        if (bodyLower.includes(keyword.toLowerCase())) {
          matchCount++;
        }
      }
    }

    const score = Math.min(matchCount / Math.max(keywords.length, 1), 1.0);
    const match = score > 0.5;

    const reason = match
      ? `Found ${matchCount} matching indicators in API activity`
      : `Only ${matchCount} matches, insufficient for threshold`;

    logger.debug({ match, score, reason }, 'API rule evaluation result');

    return { match, score, reason };
  } catch (error) {
    logger.error({ error }, 'Error evaluating API rule');
    return { match: false, score: 0, reason: 'Evaluation error' };
  }
}

/**
 * Extract keywords from natural language rule
 */
function extractKeywords(ruleNL: string): string[] {
  // Remove common stop words
  const stopWords = new Set([
    'if', 'then', 'when', 'the', 'a', 'an', 'and', 'or', 'but',
    'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'to', 'from', 'in', 'on', 'at', 'for', 'with',
    'invoke', 'trigger', 'agent', 'rule',
  ]);

  const words = ruleNL
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  return [...new Set(words)];
}

/**
 * Evaluate a condition against text
 */
function evaluateCondition(condition: string, text: string): boolean {
  const conditionLower = condition.toLowerCase();
  const textLower = text.toLowerCase();

  // Simple contains check
  if (conditionLower.startsWith('contains:')) {
    const target = conditionLower.substring(9).trim();
    return textLower.includes(target);
  }

  // Pattern match
  if (conditionLower.startsWith('matches:')) {
    const pattern = conditionLower.substring(8).trim();
    try {
      const regex = new RegExp(pattern, 'i');
      return regex.test(text);
    } catch {
      return false;
    }
  }

  // Default: simple inclusion
  return textLower.includes(conditionLower);
}
