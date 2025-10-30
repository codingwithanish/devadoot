/**
 * Rules routes
 * Handles rule evaluation for UI and API samples
 */

import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, AppError } from '../utils/error';
import { evaluateUI, evaluateAPI } from '../services/ruleEngine';

export const rulesRouter = Router();

const uiEvaluationSchema = z.object({
  agentId: z.string(),
  textSample: z.string(),
  ruleNL: z.string(),
  ruleStructured: z.any().optional(),
  url: z.string().url(),
});

const apiEvaluationSchema = z.object({
  agentId: z.string(),
  request: z.object({
    method: z.string(),
    url: z.string(),
    bodySnippet: z.string().optional(),
  }),
  response: z.object({
    status: z.number(),
    bodySnippet: z.string().optional(),
  }),
  ruleNL: z.string(),
  ruleStructured: z.any().optional(),
  url: z.string().url(),
});

/**
 * POST /rules/evaluate/ui
 * Evaluate UI text sample against rule
 */
rulesRouter.post(
  '/evaluate/ui',
  asyncHandler(async (req, res) => {
    const parsed = uiEvaluationSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(400, 'Invalid request body');
    }

    const result = await evaluateUI(parsed.data);

    res.json(result);
  })
);

/**
 * POST /rules/evaluate/api
 * Evaluate API activity against rule
 */
rulesRouter.post(
  '/evaluate/api',
  asyncHandler(async (req, res) => {
    const parsed = apiEvaluationSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(400, 'Invalid request body');
    }

    const result = await evaluateAPI(parsed.data);

    res.json(result);
  })
);
