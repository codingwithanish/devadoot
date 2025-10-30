/**
 * Cases routes
 * Handles case creation, closure, and listing
 */

import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, AppError } from '../utils/error';
import { createCase, closeCase, getCaseById, listCases } from '../services/cases';

export const casesRouter = Router();

const createCaseSchema = z.object({
  agentId: z.string(),
  url: z.string().url(),
  site: z.string(),
  ruleSnapshot: z.object({
    nl: z.string(),
    structured: z.any().optional(),
  }),
});

/**
 * POST /cases
 * Create a new case
 */
casesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = createCaseSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(400, 'Invalid request body');
    }

    const caseId = await createCase(parsed.data);

    res.json({ caseId });
  })
);

/**
 * POST /cases/:id/close
 * Close a case
 */
casesRouter.post(
  '/:id/close',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await closeCase(id);

    res.json({ ok: true });
  })
);

/**
 * GET /cases/:id
 * Get case by ID
 */
casesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const caseRecord = await getCaseById(id);

    if (!caseRecord) {
      throw new AppError(404, 'Case not found');
    }

    res.json(caseRecord);
  })
);

/**
 * GET /cases
 * List cases
 */
casesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { agentId, status, limit } = req.query;

    const cases = await listCases({
      agentId: agentId as string | undefined,
      status: status as 'open' | 'closed' | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({ cases });
  })
);
