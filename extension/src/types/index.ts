// Agent Configuration Types
export type AgentSource = 'marketplace' | 'custom';
export type MonitoringType = 'UI' | 'API' | 'Both';
export type CaseStatus = 'open' | 'closed';

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

// API Types
export interface VisitRequest {
  url: string;
  tabId: number;
}

export interface AgentMatch {
  agentId: string;
  name: string;
  monitoring: MonitoringType;
  rule: {
    nl: string;
    structured?: any;
  };
  welcomeMessage: string;
  collectors: CollectorConfig;
  agentSource: AgentSource;
  agentChatMeta: {
    type: string;
    endpoint: string;
  };
}

export interface VisitResponse {
  matches: AgentMatch[];
}

export interface UISample {
  agentId: string;
  textSample: string;
  url: string;
}

export interface APISummary {
  method: string;
  url: string;
  status?: number;
  bodySnippet?: string;
  duration?: number;
}

export interface APISample {
  agentId: string;
  summary: APISummary;
  url: string;
}

export interface RuleEvaluationRequest {
  agentId: string;
  textSample?: string;
  request?: {
    method: string;
    url: string;
    bodySnippet?: string;
  };
  response?: {
    status: number;
    bodySnippet?: string;
  };
  ruleNL: string;
  ruleStructured?: any;
  url: string;
}

export interface RuleEvaluationResponse {
  match: boolean;
  score: number;
  reason: string;
}

export interface CaseCreateRequest {
  agentId: string;
  url: string;
  site: string;
  ruleSnapshot: {
    nl: string;
    structured?: any;
  };
}

export interface CaseCreateResponse {
  caseId: string;
}

export interface MarketplaceAgent {
  id: string;
  name: string;
  type: string;
  category: string;
  description?: string;
  chatEndpoint?: string;
}

// Message Types
export type MessageType =
  | 'start-monitor'
  | 'stop-monitor'
  | 'ui-sample'
  | 'api-sample'
  | 'rule-match'
  | 'inject-popup'
  | 'popup-minimize'
  | 'popup-close'
  | 'popup-end-support'
  | 'send-chat-message'
  | 'receive-chat-message';

export interface BaseMessage {
  type: MessageType;
}

export interface StartMonitorMessage extends BaseMessage {
  type: 'start-monitor';
  match: AgentMatch;
}

export interface UISampleMessage extends BaseMessage {
  type: 'ui-sample';
  payload: UISample;
  caseInit: CaseCreateRequest;
  welcome: string;
  chatMeta: any;
  collectors: CollectorConfig;
}

export interface APISampleMessage extends BaseMessage {
  type: 'api-sample';
  payload: APISample;
  caseInit: CaseCreateRequest;
  welcome: string;
  chatMeta: any;
  collectors: CollectorConfig;
}

export interface InjectPopupMessage extends BaseMessage {
  type: 'inject-popup';
  caseId: string;
  welcome: string;
  chatMeta: any;
  agentName: string;
}

export interface PopupControlMessage extends BaseMessage {
  type: 'popup-minimize' | 'popup-close' | 'popup-end-support';
  caseId: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  content: string;
  timestamp: number;
}

export interface SendChatMessageMessage extends BaseMessage {
  type: 'send-chat-message';
  caseId: string;
  message: string;
}

export interface ReceiveChatMessageMessage extends BaseMessage {
  type: 'receive-chat-message';
  message: ChatMessage;
}

// Storage Types
export interface ExtensionStorage {
  agents: AgentConfig[];
  activeCases: Record<number, string>; // tabId -> caseId
  serverUrl: string;
  authToken: string;
  mode: 'api' | 'dummy';
}

// Collector Types
export interface CollectorResult {
  kind: string;
  data: Blob | string;
  filename: string;
}

// Tab State
export interface TabState {
  url: string;
  activeAgents: AgentMatch[];
  caseId?: string;
  monitoring: boolean;
}
