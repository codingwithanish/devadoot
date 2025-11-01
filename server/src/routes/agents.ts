/**
 * Agents routes
 * Handles marketplace agents, agent matching, and agent CRUD
 */

import { Router } from 'express';
import { asyncHandler } from '../utils/error';
import { getMarketplaceAgents, seedMarketplace } from '../services/marketplace';
import { findAgentsBySiteOrPattern } from '../services/matching';
import {
  getAllAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
} from '../services/agents';

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

/**
 * GET /agents
 * Get all user-configured agents
 */
agentsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const agents = await getAllAgents();
    res.json(agents);
  })
);

/**
 * GET /agents/:id
 * Get a single agent by ID
 */
agentsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const agent = await getAgentById(id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json(agent);
  })
);

/**
 * POST /agents
 * Create a new agent
 */
agentsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const config = req.body;

    // Basic validation
    if (!config.name || !config.sites || !config.monitoring || !config.ruleNL) {
      return res.status(400).json({
        error: 'Missing required fields: name, sites, monitoring, ruleNL',
      });
    }

    const agent = await createAgent(config);
    res.status(201).json(agent);
  })
);

/**
 * PUT /agents/:id
 * Update an existing agent
 */
agentsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const config = req.body;

    // Verify agent exists
    const existing = await getAgentById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Basic validation
    if (!config.name || !config.sites || !config.monitoring || !config.ruleNL) {
      return res.status(400).json({
        error: 'Missing required fields: name, sites, monitoring, ruleNL',
      });
    }

    const agent = await updateAgent(id, config);
    res.json(agent);
  })
);

/**
 * DELETE /agents/:id
 * Delete an agent
 */
agentsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Verify agent exists
    const existing = await getAgentById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    await deleteAgent(id);
    res.json({ ok: true });
  })
);
