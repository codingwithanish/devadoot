/**
 * Dummy data for demo mode
 * Provides realistic sample data without requiring backend server
 */

import type { AgentConfig, MarketplaceAgent, AgentMatch } from "@/types";

// Marketplace agents organized by category
export const DUMMY_MARKETPLACE_AGENTS: MarketplaceAgent[] = [
  // Shopping Category
  {
    id: "mp-price-compare",
    name: "Price Compare Agent",
    type: "marketplace",
    category: "Shopping",
    description:
      "Monitors prices across different sites and alerts you to better deals",
    chatEndpoint: "wss://demo.devadoot.com/price-compare",
  },
  {
    id: "mp-promo-code",
    name: "Promo Code Agent",
    type: "marketplace",
    category: "Shopping",
    description: "Automatically finds and applies promo codes at checkout",
    chatEndpoint: "wss://demo.devadoot.com/promo-code",
  },
  {
    id: "mp-product-review",
    name: "Product Review Agent",
    type: "marketplace",
    category: "Shopping",
    description: "Analyzes product reviews and highlights key insights",
    chatEndpoint: "wss://demo.devadoot.com/product-review",
  },
  {
    id: "mp-ecovacs-support",
    name: "Ecovacs Vacuum Cleaner Support",
    type: "marketplace",
    category: "Shopping",
    description: "Expert support for Ecovacs vacuum cleaners on Amazon",
    chatEndpoint: "wss://demo.devadoot.com/ecovacs-support",
  },

  // Support Category
  {
    id: "mp-customer-support",
    name: "Customer Support Agent",
    type: "marketplace",
    category: "Support",
    description: "Provides instant customer support and troubleshooting",
    chatEndpoint: "wss://demo.devadoot.com/customer-support",
  },
  {
    id: "mp-technical-help",
    name: "Technical Help Agent",
    type: "marketplace",
    category: "Support",
    description: "Technical assistance for software and hardware issues",
    chatEndpoint: "wss://demo.devadoot.com/technical-help",
  },

  // AI Category
  {
    id: "mp-smart-assistant",
    name: "Smart Assistant",
    type: "marketplace",
    category: "AI",
    description: "AI-powered assistant for general queries and tasks",
    chatEndpoint: "wss://demo.devadoot.com/smart-assistant",
  },
  {
    id: "mp-content-writer",
    name: "Content Writer Agent",
    type: "marketplace",
    category: "AI",
    description: "Helps you write engaging content and summaries",
    chatEndpoint: "wss://demo.devadoot.com/content-writer",
  },

  // Productivity Category
  {
    id: "mp-task-manager",
    name: "Task Manager Agent",
    type: "marketplace",
    category: "Productivity",
    description: "Organizes and tracks your tasks across websites",
    chatEndpoint: "wss://demo.devadoot.com/task-manager",
  },
  {
    id: "mp-meeting-scheduler",
    name: "Meeting Scheduler",
    type: "marketplace",
    category: "Productivity",
    description: "Schedules meetings and manages your calendar",
    chatEndpoint: "wss://demo.devadoot.com/meeting-scheduler",
  },
];

// Pre-configured agents for dummy mode
export const DUMMY_AGENTS: AgentConfig[] = [
  {
    id: "agent-ecovacs-amazon",
    name: "Ecovacs Vacuum Cleaner Support Agent",
    sites: ["amazon.com", "www.amazon.com"],
    urlPatterns: [".*ecovacs.*", ".*vacuum.*cleaner.*", ".*robot.*vacuum.*"],
    source: "marketplace",
    marketplaceId: "mp-ecovacs-support",
    monitoring: "Both",
    ruleNL:
      "Activate when user visits Amazon page containing Ecovacs vacuum cleaner products",
    welcomeMessage:
      "Hi there! I’m your Ecovacs Vacuum Cleaner Support Agent. I can help you find the perfect robot vacuum cleaner for your home. Could you please share a few details about your home so I can assist you better?",
    collectors: {
      har: true,
      console: true,
      cookies: false,
      dom: true,
      memory: false,
      performance: true,
      screenshot: true,
      screenRecording: false,
    },
    priority: 0,
  },
  {
    id: "agent-price-compare",
    name: "Shopping Price Comparison",
    sites: ["amazon.com", "ebay.com", "walmart.com", "target.com"],
    urlPatterns: [".*\\/product\\/.*", ".*\\/item\\/.*", ".*\\/dp\\/.*"],
    source: "marketplace",
    marketplaceId: "mp-price-compare",
    monitoring: "UI",
    ruleNL: "Activate when user views a product page to compare prices",
    welcomeMessage:
      "I found this product! Would you like me to check if there are better prices elsewhere?",
    collectors: {
      har: false,
      console: false,
      cookies: false,
      dom: true,
      memory: false,
      performance: false,
      screenshot: true,
      screenRecording: false,
    },
    priority: 1,
  },
  {
    id: "agent-promo-code",
    name: "Promo Code Finder",
    sites: ["*.com"],
    urlPatterns: [".*checkout.*", ".*cart.*", ".*payment.*"],
    source: "marketplace",
    marketplaceId: "mp-promo-code",
    monitoring: "UI",
    ruleNL: "Activate when user reaches checkout or cart page",
    welcomeMessage:
      "Hold on! Let me find the best promo codes for your purchase.",
    collectors: {
      har: false,
      console: false,
      cookies: false,
      dom: true,
      memory: false,
      performance: false,
      screenshot: false,
      screenRecording: false,
    },
    priority: 2,
  },
  {
    id: "agent-customer-support",
    name: "General Customer Support",
    sites: ["support.*.com", "help.*.com"],
    urlPatterns: [],
    source: "marketplace",
    marketplaceId: "mp-customer-support",
    monitoring: "Both",
    ruleNL: "Activate when user encounters errors or visits support pages",
    welcomeMessage:
      "Hi! I noticed you might need some help. How can I assist you today?",
    collectors: {
      har: true,
      console: true,
      cookies: false,
      dom: true,
      memory: false,
      performance: true,
      screenshot: true,
      screenRecording: false,
    },
    priority: 3,
  },
];

/**
 * Get matching agents for a given URL (dummy mode)
 */
export function getDummyAgentMatches(url: string): AgentMatch[] {
  console.log("[DUMMY MODE] Checking agent matches for URL:", url);
  const matches: AgentMatch[] = [];

  for (const agent of DUMMY_AGENTS) {
    // Check if URL matches any of the agent's sites
    const hostname = new URL(url).hostname;
    const siteMatch = agent.sites.some((site) => {
      return hostname.includes(site) || site.includes(hostname);
    });

    console.log(
      `[DUMMY MODE] Agent "${agent.name}": hostname="${hostname}", sites=${JSON.stringify(agent.sites)}, siteMatch=${siteMatch}`,
    );

    if (!siteMatch) continue;

    // Check URL patterns
    let patternMatch = agent.urlPatterns.length === 0; // If no patterns, match by default
    for (const pattern of agent.urlPatterns) {
      try {
        const regex = new RegExp(pattern, "i");
        if (regex.test(url)) {
          patternMatch = true;
          console.log(
            `[DUMMY MODE] Agent "${agent.name}": URL pattern "${pattern}" MATCHED!`,
          );
          break;
        }
      } catch (e) {
        console.error("Invalid regex pattern:", pattern);
      }
    }

    console.log(
      `[DUMMY MODE] Agent "${agent.name}": patternMatch=${patternMatch}, urlPatterns=${JSON.stringify(agent.urlPatterns)}`,
    );

    if (siteMatch && patternMatch) {
      console.log(
        `[DUMMY MODE] ✓ Agent "${agent.name}" MATCHED for URL: ${url}`,
      );

      // Find marketplace agent details
      const marketplaceAgent = DUMMY_MARKETPLACE_AGENTS.find(
        (ma) => ma.id === agent.marketplaceId,
      );

      matches.push({
        agentId: agent.id,
        name: agent.name,
        monitoring: agent.monitoring,
        rule: {
          nl: agent.ruleNL,
          structured: agent.ruleStructured,
        },
        welcomeMessage: agent.welcomeMessage,
        collectors: agent.collectors,
        agentSource: agent.source,
        agentChatMeta: {
          type: agent.source,
          endpoint:
            agent.source === "marketplace"
              ? marketplaceAgent?.chatEndpoint || ""
              : agent.customEndpoint || "",
        },
      });
    }
  }

  console.log(
    `[DUMMY MODE] Total matches found: ${matches.length}`,
    matches.map((m) => m.name),
  );
  return matches;
}

/**
 * Get a specific agent by ID (dummy mode)
 */
export function getDummyAgentById(id: string): AgentConfig | undefined {
  return DUMMY_AGENTS.find((agent) => agent.id === id);
}

/**
 * Get all agents (dummy mode)
 */
export function getAllDummyAgents(): AgentConfig[] {
  return [...DUMMY_AGENTS];
}

/**
 * Get all marketplace agents (dummy mode)
 */
export function getAllDummyMarketplaceAgents(): MarketplaceAgent[] {
  return [...DUMMY_MARKETPLACE_AGENTS];
}

/**
 * Create a new agent (dummy mode)
 */
export function createDummyAgent(agent: AgentConfig): AgentConfig {
  DUMMY_AGENTS.push(agent);
  return agent;
}

/**
 * Update an agent (dummy mode)
 */
export function updateDummyAgent(agent: AgentConfig): AgentConfig {
  const index = DUMMY_AGENTS.findIndex((a) => a.id === agent.id);
  if (index !== -1) {
    DUMMY_AGENTS[index] = agent;
  }
  return agent;
}

/**
 * Delete an agent (dummy mode)
 */
export function deleteDummyAgent(id: string): boolean {
  const index = DUMMY_AGENTS.findIndex((a) => a.id === id);
  if (index !== -1) {
    DUMMY_AGENTS.splice(index, 1);
    return true;
  }
  return false;
}
