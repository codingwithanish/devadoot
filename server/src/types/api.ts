/**
 * API type definitions
 */

// Request types
export interface VisitRequest {
  url: string;
  tabId: number;
}

export interface UIEvaluationRequest {
  agentId: string;
  textSample: string;
  ruleNL: string;
  ruleStructured?: any;
  url: string;
}

export interface APIEvaluationRequest {
  agentId: string;
  request: {
    method: string;
    url: string;
    bodySnippet?: string;
  };
  response: {
    status: number;
    bodySnippet?: string;
  };
  ruleNL: string;
  ruleStructured?: any;
  url: string;
}

export interface CreateCaseRequest {
  agentId: string;
  url: string;
  site: string;
  ruleSnapshot: {
    nl: string;
    structured?: any;
  };
}

// Response types
export interface AgentMatch {
  agentId: string;
  name: string;
  monitoring: string;
  rule: {
    nl: string;
    structured?: any;
  };
  welcomeMessage: string;
  collectors: any;
  agentSource: string;
  agentChatMeta: {
    type: string;
    endpoint: string;
  };
}

export interface VisitResponse {
  matches: AgentMatch[];
}

export interface EvaluationResponse {
  match: boolean;
  score: number;
  reason: string;
}

export interface CreateCaseResponse {
  caseId: string;
}

export interface UploadResponse {
  artifactId: string;
  s3Key: string;
  s3Url: string;
}
