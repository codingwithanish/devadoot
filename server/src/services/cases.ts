/**
 * Case management service
 */

import { prisma } from '../db';
import { logger } from '../utils/logger';

interface CreateCaseParams {
  agentId: string;
  url: string;
  site: string;
  ruleSnapshot: {
    nl: string;
    structured?: any;
  };
}

/**
 * Create a new case
 */
export async function createCase(params: CreateCaseParams): Promise<string> {
  const { agentId, url, site, ruleSnapshot } = params;

  logger.info({ agentId, url, site }, 'Creating case');

  try {
    const caseRecord = await prisma.case.create({
      data: {
        agentId,
        url,
        site,
        ruleSnapshot: ruleSnapshot as any,
        status: 'open',
      },
    });

    logger.info({ caseId: caseRecord.id }, 'Case created');

    return caseRecord.id;
  } catch (error) {
    logger.error({ error, params }, 'Error creating case');
    throw new Error('Failed to create case');
  }
}

/**
 * Close a case
 */
export async function closeCase(caseId: string): Promise<void> {
  logger.info({ caseId }, 'Closing case');

  try {
    await prisma.case.update({
      where: { id: caseId },
      data: {
        status: 'closed',
        closedAt: new Date(),
      },
    });

    logger.info({ caseId }, 'Case closed');
  } catch (error) {
    logger.error({ error, caseId }, 'Error closing case');
    throw new Error('Failed to close case');
  }
}

/**
 * Get case by ID
 */
export async function getCaseById(caseId: string) {
  try {
    return await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        artifacts: true,
        agent: true,
      },
    });
  } catch (error) {
    logger.error({ error, caseId }, 'Error getting case');
    return null;
  }
}

/**
 * List cases with optional filters
 */
export async function listCases(filters?: {
  agentId?: string;
  status?: 'open' | 'closed';
  limit?: number;
}) {
  try {
    return await prisma.case.findMany({
      where: {
        agentId: filters?.agentId,
        status: filters?.status,
      },
      include: {
        artifacts: true,
        agent: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: filters?.limit || 100,
    });
  } catch (error) {
    logger.error({ error }, 'Error listing cases');
    return [];
  }
}
