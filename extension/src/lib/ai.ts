/**
 * Chrome Built-in AI Integration
 * Provides wrapper functions for Chrome's experimental AI APIs
 */

declare global {
  interface Window {
    ai?: {
      languageModel?: {
        generate: (options: { prompt: string }) => Promise<{ text: string }>;
      };
    };
  }
}

/**
 * Check if Chrome built-in AI is available
 */
export async function aiAvailable(): Promise<boolean> {
  try {
    const chrome = globalThis.chrome as any;
    return Boolean(chrome?.ai?.languageModel?.generate);
  } catch {
    return false;
  }
}

/**
 * Safely parse JSON from AI response
 */
function safeJson(text: string): any | null {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    // Try to parse the whole text as JSON
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Convert natural language rule to structured JSON format
 * @param nl Natural language rule description
 * @returns Structured rule object or null if AI unavailable
 */
export async function parseRuleNLtoJSON(nl: string): Promise<any | null> {
  if (!(await aiAvailable())) {
    console.warn('Chrome AI not available for rule parsing');
    return null;
  }

  try {
    const chrome = globalThis.chrome as any;
    const prompt = `Convert this monitoring rule into structured JSON triggers.
Rule: """${nl}"""

Respond with **only** JSON in this format:
{
  "intent": "brief description",
  "triggers": {
    "keywords": ["array", "of", "keywords"],
    "patterns": ["regex patterns if applicable"],
    "conditions": ["specific conditions to check"]
  }
}`;

    const result = await chrome.ai.languageModel.generate({ prompt });
    return safeJson(result?.text || '');
  } catch (error) {
    console.error('Error parsing rule with AI:', error);
    return null;
  }
}

/**
 * Get a local hint if a sample matches a rule
 * Note: This is only a hint; backend evaluation is authoritative
 * @param ruleNL Natural language rule
 * @param sample Observed text or API summary
 * @returns Boolean match hint or null if AI unavailable
 */
export async function localMatchHint(
  ruleNL: string,
  sample: string
): Promise<boolean | null> {
  if (!(await aiAvailable())) {
    return null;
  }

  try {
    const chrome = globalThis.chrome as any;
    const prompt = `Does this observed text satisfy the intent of the rule?

Rule: """${ruleNL}"""
Text: """${sample}"""

Answer exactly: true or false.`;

    const result = await chrome.ai.languageModel.generate({ prompt });
    const text = (result?.text || '').trim().toLowerCase();

    if (text === 'true') return true;
    if (text === 'false') return false;

    // Try to parse as boolean
    return /^true$/i.test(text);
  } catch (error) {
    console.error('Error getting match hint with AI:', error);
    return null;
  }
}

/**
 * Generate a welcome message based on rule context
 * @param ruleName Name of the triggered rule
 * @param context Additional context about the match
 * @returns Generated welcome message or default
 */
export async function generateWelcomeMessage(
  ruleName: string,
  context?: string
): Promise<string> {
  if (!(await aiAvailable())) {
    return `Support has been activated for: ${ruleName}`;
  }

  try {
    const chrome = globalThis.chrome as any;
    const prompt = `Generate a brief, friendly welcome message for a support chat that was triggered by this rule: "${ruleName}".
${context ? `Context: ${context}` : ''}

Keep it under 50 words, professional but warm. Just return the message text.`;

    const result = await chrome.ai.languageModel.generate({ prompt });
    return result?.text || `Support has been activated for: ${ruleName}`;
  } catch {
    return `Support has been activated for: ${ruleName}`;
  }
}
