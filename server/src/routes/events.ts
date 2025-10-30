/**
 * Events routes
 * Handles visit events and agent matching
 */

import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, AppError } from '../utils/error';
import { findAgentsBySiteOrPattern } from '../services/matching';

export const eventsRouter = Router();

const visitSchema = z.object({
  url: z.string().url(),
  tabId: z.number(),
});

/**
 * POST /events/visit
 * Notify backend of page visit and get matching agents
 */
eventsRouter.post(
  '/visit',
  asyncHandler(async (req, res) => {
    const parsed = visitSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new AppError(400, 'Invalid request body');
    }

    const { url, tabId } = parsed.data;

    // Extract hostname
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Find matching agents
    const matches = await findAgentsBySiteOrPattern(hostname, url);

    res.json({ matches });
  })
);
