/**
 * API Client for communicating with the DevaDoot backend server
 */

import type {
  VisitRequest,
  VisitResponse,
  RuleEvaluationRequest,
  RuleEvaluationResponse,
  CaseCreateRequest,
  CaseCreateResponse,
  MarketplaceAgent,
  AgentConfig,
} from '@/types';
import {
  getDummyAgentMatches,
  getAllDummyAgents,
  getAllDummyMarketplaceAgents,
  createDummyAgent,
  updateDummyAgent,
  deleteDummyAgent,
} from '@/lib/dummy-data';
import { nanoid } from 'nanoid';

class ApiClient {
  private baseUrl: string = 'http://localhost:8080';
  private authToken: string = '';
  private mode: 'api' | 'dummy' = 'api';

  async init() {
    const result = await chrome.storage.sync.get(['serverUrl', 'authToken', 'mode']);
    if (result.serverUrl) {
      this.baseUrl = result.serverUrl;
    }
    if (result.authToken) {
      this.authToken = result.authToken;
    }
    if (result.mode) {
      this.mode = result.mode;
    } else {
      // Set default mode to dummy if not configured
      this.mode = 'dummy';
      await chrome.storage.sync.set({ mode: 'dummy' });
    }
    console.log(`[API CLIENT] Initialized - Mode: ${this.mode}, BaseURL: ${this.baseUrl}`);
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API Error ${response.status}: ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  async postVisit(data: VisitRequest): Promise<VisitResponse> {
    console.log(`[API CLIENT] postVisit called - Mode: ${this.mode}, URL: ${data.url}`);

    if (this.mode === 'dummy') {
      // Use dummy data
      console.log('[API CLIENT] Using DUMMY mode - calling getDummyAgentMatches');
      const matches = getDummyAgentMatches(data.url);
      console.log(`[API CLIENT] Dummy mode returned ${matches.length} matches`);
      return { matches };
    }

    console.log('[API CLIENT] Using API mode - calling backend');
    return this.fetch<VisitResponse>('/api/events/visit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async evaluateUIRule(
    data: RuleEvaluationRequest
  ): Promise<RuleEvaluationResponse> {
    if (this.mode === 'dummy') {
      // In dummy mode, always return a match for demo purposes
      return {
        match: true,
        score: 0.95,
        reason: 'Dummy mode: Rule matched for demonstration',
      };
    }

    return this.fetch<RuleEvaluationResponse>('/api/rules/evaluate/ui', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async evaluateAPIRule(
    data: RuleEvaluationRequest
  ): Promise<RuleEvaluationResponse> {
    if (this.mode === 'dummy') {
      // In dummy mode, always return a match for demo purposes
      return {
        match: true,
        score: 0.92,
        reason: 'Dummy mode: API rule matched for demonstration',
      };
    }

    return this.fetch<RuleEvaluationResponse>('/api/rules/evaluate/api', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createCase(data: CaseCreateRequest): Promise<CaseCreateResponse> {
    if (this.mode === 'dummy') {
      // Generate a dummy case ID
      return {
        caseId: `dummy-case-${nanoid(8)}`,
      };
    }

    return this.fetch<CaseCreateResponse>('/api/cases', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async closeCase(caseId: string): Promise<{ ok: boolean }> {
    if (this.mode === 'dummy') {
      // In dummy mode, just return success
      return { ok: true };
    }

    return this.fetch<{ ok: boolean }>(`/api/cases/${caseId}/close`, {
      method: 'POST',
    });
  }

  async uploadArtifact(
    caseId: string,
    kind: string,
    data: Blob | string
  ): Promise<any> {
    if (this.mode === 'dummy') {
      // In dummy mode, simulate successful upload
      return {
        s3Key: `dummy/${caseId}/${kind}-${nanoid(8)}`,
        uploaded: true,
      };
    }

    const formData = new FormData();
    formData.append('kind', kind);

    if (typeof data === 'string') {
      formData.append('json', data);
    } else {
      formData.append('file', data);
    }

    const url = `${this.baseUrl}/api/cases/${caseId}/upload`;
    const headers: HeadersInit = {};

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Upload failed ${response.status}: ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Upload artifact failed:', error);
      throw error;
    }
  }

  async getMarketplaceAgents(): Promise<MarketplaceAgent[]> {
    if (this.mode === 'dummy') {
      return getAllDummyMarketplaceAgents();
    }

    return this.fetch<MarketplaceAgent[]>('/api/agents/marketplace');
  }

  async getAgentMatches(site: string): Promise<VisitResponse> {
    if (this.mode === 'dummy') {
      const matches = getDummyAgentMatches(site);
      return { matches };
    }

    return this.fetch<VisitResponse>(`/api/agents/match?site=${encodeURIComponent(site)}`);
  }

  async getAgents(): Promise<AgentConfig[]> {
    if (this.mode === 'dummy') {
      return getAllDummyAgents();
    }

    return this.fetch<AgentConfig[]>('/api/agents');
  }

  async createAgent(agent: AgentConfig): Promise<AgentConfig> {
    if (this.mode === 'dummy') {
      return createDummyAgent(agent);
    }

    return this.fetch<AgentConfig>('/api/agents', {
      method: 'POST',
      body: JSON.stringify(agent),
    });
  }

  async updateAgent(agent: AgentConfig): Promise<AgentConfig> {
    if (this.mode === 'dummy') {
      return updateDummyAgent(agent);
    }

    return this.fetch<AgentConfig>(`/api/agents/${agent.id}`, {
      method: 'PUT',
      body: JSON.stringify(agent),
    });
  }

  async deleteAgent(agentId: string): Promise<{ ok: boolean }> {
    if (this.mode === 'dummy') {
      const deleted = deleteDummyAgent(agentId);
      return { ok: deleted };
    }

    return this.fetch<{ ok: boolean }>(`/api/agents/${agentId}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
