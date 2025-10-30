/**
 * Agent matching service
 * Finds agents that should monitor a given URL
 */

import { prisma } from '../db';
import { logger } from '../utils/logger';

export interface AgentMatch {
  agentId: string;
  name: string;
  monitoring: string;
  rule: {
    nl: string;
    structured?: any;
  };
  welcomeMessage: string;
  collectors: any;
  agentSource: string;
  agentChatMeta: {
    type: string;
    endpoint: string;
  };
}

/**
 * Find agents that match a given site or URL
 */
export async function findAgentsBySiteOrPattern(
  hostname: string,
  url: string
): Promise<AgentMatch[]> {
  logger.debug({ hostname, url }, 'Finding matching agents');

  try {
    // Query agents with matching sites
    const agentsWithSites = await prisma.agent.findMany({
      where: {
        sites: {
          some: {
            OR: [
              { site: hostname },
              { site: { endsWith: `.${hostname}` } },
            ],
          },
        },
      },
      include: {
        sites: true,
        patterns: true,
      },
      orderBy: {
        priority: 'asc',
      },
    });

    // Query all agents with URL patterns (need to check in memory)
    const agentsWithPatterns = await prisma.agent.findMany({
      where: {
        patterns: {
          some: {},
        },
      },
      include: {
        sites: true,
        patterns: true,
      },
      orderBy: {
        priority: 'asc',
      },
    });

    // Filter by URL patterns
    const patternMatches = agentsWithPatterns.filter(agent => {
      return agent.patterns.some(({ pattern }) => {
        try {
          const regex = new RegExp(pattern);
          return regex.test(url);
        } catch {
          return false;
        }
      });
    });

    // Combine and deduplicate
    const allMatches = [...agentsWithSites, ...patternMatches];
    const uniqueMatches = Array.from(
      new Map(allMatches.map(a => [a.id, a])).values()
    );

    logger.info(
      { count: uniqueMatches.length, hostname },
      'Found matching agents'
    );

    // Transform to match response format
    const results: AgentMatch[] = await Promise.all(
      uniqueMatches.map(async agent => {
        const chatMeta = await getAgentChatMeta(agent);

        return {
          agentId: agent.id,
          name: agent.name,
          monitoring: agent.monitoring,
          rule: {
            nl: agent.ruleNL,
            structured: agent.ruleStructured as any,
          },
          welcomeMessage: agent.welcomeMessage,
          collectors: agent.collectors as any,
          agentSource: agent.source,
          agentChatMeta: chatMeta,
        };
      })
    );

    return results;
  } catch (error) {
    logger.error({ error, hostname }, 'Error finding matching agents');
    return [];
  }
}

/**
 * Get chat metadata for an agent
 */
async function getAgentChatMeta(agent: any): Promise<{ type: string; endpoint: string }> {
  if (agent.source === 'marketplace' && agent.marketplaceId) {
    const marketplaceAgent = await prisma.marketplaceAgent.findUnique({
      where: { id: agent.marketplaceId },
    });

    if (marketplaceAgent?.chatEndpoint) {
      return {
        type: marketplaceAgent.type,
        endpoint: marketplaceAgent.chatEndpoint,
      };
    }
  }

  if (agent.source === 'custom' && agent.customEndpoint) {
    return {
      type: 'chat',
      endpoint: agent.customEndpoint,
    };
  }

  // Default fallback
  return {
    type: 'chat',
    endpoint: '',
  };
}
