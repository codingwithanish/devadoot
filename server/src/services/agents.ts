/**
 * Agent service
 * Handles CRUD operations for user-configured agents
 */

import { prisma } from '../db';
import { AgentSource, MonitoringType } from '@prisma/client';

export interface CollectorConfig {
  har: boolean;
  console: boolean;
  cookies: boolean;
  dom: boolean;
  memory: boolean;
  performance: boolean;
  screenshot: boolean;
  screenRecording: boolean;
}

export interface AgentConfig {
  id: string;
  name: string;
  sites: string[];
  urlPatterns: string[];
  source: AgentSource;
  marketplaceId?: string;
  customEndpoint?: string;
  monitoring: MonitoringType;
  ruleNL: string;
  ruleStructured?: any;
  welcomeMessage: string;
  collectors: CollectorConfig;
  priority?: number;
}

/**
 * Get all agents with their sites and patterns
 */
export async function getAllAgents(): Promise<AgentConfig[]> {
  const agents = await prisma.agent.findMany({
    include: {
      sites: true,
      patterns: true,
    },
    orderBy: {
      priority: 'asc',
    },
  });

  return agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    sites: agent.sites.map((s) => s.site),
    urlPatterns: agent.patterns.map((p) => p.pattern),
    source: agent.source,
    marketplaceId: agent.marketplaceId || undefined,
    customEndpoint: agent.customEndpoint || undefined,
    monitoring: agent.monitoring,
    ruleNL: agent.ruleNL,
    ruleStructured: agent.ruleStructured,
    welcomeMessage: agent.welcomeMessage,
    collectors: agent.collectors as CollectorConfig,
    priority: agent.priority,
  }));
}

/**
 * Get a single agent by ID
 */
export async function getAgentById(id: string): Promise<AgentConfig | null> {
  const agent = await prisma.agent.findUnique({
    where: { id },
    include: {
      sites: true,
      patterns: true,
    },
  });

  if (!agent) {
    return null;
  }

  return {
    id: agent.id,
    name: agent.name,
    sites: agent.sites.map((s) => s.site),
    urlPatterns: agent.patterns.map((p) => p.pattern),
    source: agent.source,
    marketplaceId: agent.marketplaceId || undefined,
    customEndpoint: agent.customEndpoint || undefined,
    monitoring: agent.monitoring,
    ruleNL: agent.ruleNL,
    ruleStructured: agent.ruleStructured,
    welcomeMessage: agent.welcomeMessage,
    collectors: agent.collectors as CollectorConfig,
    priority: agent.priority,
  };
}

/**
 * Create a new agent
 */
export async function createAgent(config: AgentConfig): Promise<AgentConfig> {
  const agent = await prisma.agent.create({
    data: {
      id: config.id,
      name: config.name,
      source: config.source,
      marketplaceId: config.marketplaceId,
      customEndpoint: config.customEndpoint,
      monitoring: config.monitoring,
      ruleNL: config.ruleNL,
      ruleStructured: config.ruleStructured,
      welcomeMessage: config.welcomeMessage,
      collectors: config.collectors as any,
      priority: config.priority || 100,
      sites: {
        create: config.sites.map((site) => ({ site })),
      },
      patterns: {
        create: config.urlPatterns.map((pattern) => ({ pattern })),
      },
    },
    include: {
      sites: true,
      patterns: true,
    },
  });

  return {
    id: agent.id,
    name: agent.name,
    sites: agent.sites.map((s) => s.site),
    urlPatterns: agent.patterns.map((p) => p.pattern),
    source: agent.source,
    marketplaceId: agent.marketplaceId || undefined,
    customEndpoint: agent.customEndpoint || undefined,
    monitoring: agent.monitoring,
    ruleNL: agent.ruleNL,
    ruleStructured: agent.ruleStructured,
    welcomeMessage: agent.welcomeMessage,
    collectors: agent.collectors as CollectorConfig,
    priority: agent.priority,
  };
}

/**
 * Update an existing agent
 */
export async function updateAgent(
  id: string,
  config: AgentConfig
): Promise<AgentConfig> {
  // Delete existing sites and patterns, then recreate them
  await prisma.agentSite.deleteMany({
    where: { agentId: id },
  });

  await prisma.agentUrlPattern.deleteMany({
    where: { agentId: id },
  });

  const agent = await prisma.agent.update({
    where: { id },
    data: {
      name: config.name,
      source: config.source,
      marketplaceId: config.marketplaceId,
      customEndpoint: config.customEndpoint,
      monitoring: config.monitoring,
      ruleNL: config.ruleNL,
      ruleStructured: config.ruleStructured,
      welcomeMessage: config.welcomeMessage,
      collectors: config.collectors as any,
      priority: config.priority || 100,
      sites: {
        create: config.sites.map((site) => ({ site })),
      },
      patterns: {
        create: config.urlPatterns.map((pattern) => ({ pattern })),
      },
    },
    include: {
      sites: true,
      patterns: true,
    },
  });

  return {
    id: agent.id,
    name: agent.name,
    sites: agent.sites.map((s) => s.site),
    urlPatterns: agent.patterns.map((p) => p.pattern),
    source: agent.source,
    marketplaceId: agent.marketplaceId || undefined,
    customEndpoint: agent.customEndpoint || undefined,
    monitoring: agent.monitoring,
    ruleNL: agent.ruleNL,
    ruleStructured: agent.ruleStructured,
    welcomeMessage: agent.welcomeMessage,
    collectors: agent.collectors as CollectorConfig,
    priority: agent.priority,
  };
}

/**
 * Delete an agent
 */
export async function deleteAgent(id: string): Promise<void> {
  await prisma.agent.delete({
    where: { id },
  });
}
