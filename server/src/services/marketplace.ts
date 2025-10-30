/**
 * Marketplace service
 * Manages marketplace agents
 */

import { prisma } from '../db';
import { logger } from '../utils/logger';

/**
 * Get all marketplace agents
 */
export async function getMarketplaceAgents() {
  try {
    return await prisma.marketplaceAgent.findMany({
      orderBy: { name: 'asc' },
    });
  } catch (error) {
    logger.error({ error }, 'Error getting marketplace agents');
    return [];
  }
}

/**
 * Get marketplace agent by ID
 */
export async function getMarketplaceAgentById(id: string) {
  try {
    return await prisma.marketplaceAgent.findUnique({
      where: { id },
    });
  } catch (error) {
    logger.error({ error, id }, 'Error getting marketplace agent');
    return null;
  }
}

/**
 * Seed marketplace with default agents
 */
export async function seedMarketplace() {
  logger.info('Seeding marketplace');

  const defaultAgents = [
    {
      id: 'chat-support-ai',
      name: 'Chat Support AI',
      type: 'chat',
      description: 'Live support chat with AI assistance',
      chatEndpoint: 'wss://example.com/chat',
    },
    {
      id: 'error-analyzer',
      name: 'Error Analyzer',
      type: 'analysis',
      description: 'Automatic error analysis and debugging assistance',
      chatEndpoint: 'wss://example.com/analyze',
    },
    {
      id: 'performance-monitor',
      name: 'Performance Monitor',
      type: 'monitoring',
      description: 'Real-time performance monitoring and optimization',
      chatEndpoint: 'wss://example.com/perf',
    },
  ];

  try {
    for (const agent of defaultAgents) {
      await prisma.marketplaceAgent.upsert({
        where: { id: agent.id },
        create: agent,
        update: agent,
      });
    }

    logger.info('Marketplace seeded');
  } catch (error) {
    logger.error({ error }, 'Error seeding marketplace');
  }
}
