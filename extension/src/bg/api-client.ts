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

class ApiClient {
  private baseUrl: string = 'http://localhost:8080';
  private authToken: string = '';

  async init() {
    const result = await chrome.storage.sync.get(['serverUrl', 'authToken']);
    if (result.serverUrl) {
      this.baseUrl = result.serverUrl;
    }
    if (result.authToken) {
      this.authToken = result.authToken;
    }
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
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
    return this.fetch<VisitResponse>('/api/events/visit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async evaluateUIRule(
    data: RuleEvaluationRequest
  ): Promise<RuleEvaluationResponse> {
    return this.fetch<RuleEvaluationResponse>('/api/rules/evaluate/ui', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async evaluateAPIRule(
    data: RuleEvaluationRequest
  ): Promise<RuleEvaluationResponse> {
    return this.fetch<RuleEvaluationResponse>('/api/rules/evaluate/api', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createCase(data: CaseCreateRequest): Promise<CaseCreateResponse> {
    return this.fetch<CaseCreateResponse>('/api/cases', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async closeCase(caseId: string): Promise<{ ok: boolean }> {
    return this.fetch<{ ok: boolean }>(`/api/cases/${caseId}/close`, {
      method: 'POST',
    });
  }

  async uploadArtifact(
    caseId: string,
    kind: string,
    data: Blob | string
  ): Promise<any> {
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
    return this.fetch<MarketplaceAgent[]>('/api/agents/marketplace');
  }

  async getAgentMatches(site: string): Promise<VisitResponse> {
    return this.fetch<VisitResponse>(`/api/agents/match?site=${encodeURIComponent(site)}`);
  }

  async getAgents(): Promise<AgentConfig[]> {
    return this.fetch<AgentConfig[]>('/api/agents');
  }

  async createAgent(agent: AgentConfig): Promise<AgentConfig> {
    return this.fetch<AgentConfig>('/api/agents', {
      method: 'POST',
      body: JSON.stringify(agent),
    });
  }

  async updateAgent(agent: AgentConfig): Promise<AgentConfig> {
    return this.fetch<AgentConfig>(`/api/agents/${agent.id}`, {
      method: 'PUT',
      body: JSON.stringify(agent),
    });
  }

  async deleteAgent(agentId: string): Promise<{ ok: boolean }> {
    return this.fetch<{ ok: boolean }>(`/api/agents/${agentId}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
