/**
 * Agents routes
 * Handles marketplace agents and agent matching
 */

import { Router } from 'express';
import { asyncHandler } from '../utils/error';
import { getMarketplaceAgents, seedMarketplace } from '../services/marketplace';
import { findAgentsBySiteOrPattern } from '../services/matching';

export const agentsRouter = Router();

/**
 * GET /agents/marketplace
 * Get all marketplace agents
 */
agentsRouter.get(
  '/marketplace',
  asyncHandler(async (req, res) => {
    const agents = await getMarketplaceAgents();
    res.json(agents);
  })
);

/**
 * GET /agents/match
 * Get agents matching a site
 */
agentsRouter.get(
  '/match',
  asyncHandler(async (req, res) => {
    const { site } = req.query;

    if (!site || typeof site !== 'string') {
      return res.status(400).json({ error: 'site parameter is required' });
    }

    const matches = await findAgentsBySiteOrPattern(site, `https://${site}`);

    res.json({ matches });
  })
);

/**
 * POST /agents/marketplace/seed
 * Seed marketplace with default agents (development only)
 */
if (process.env.NODE_ENV === 'development') {
  agentsRouter.post(
    '/marketplace/seed',
    asyncHandler(async (req, res) => {
      await seedMarketplace();
      res.json({ ok: true });
    })
  );
}
