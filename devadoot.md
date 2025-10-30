# DevaDoot — Chrome Extension + Node Server

**Agent-Orchestrated Monitoring with Interactive Chat**  
**Version:** 1.0 • **Date:** 2025-10-29 (IST) • **Owner:** Anish Antony

* * *

## Table of Contents

1. Overview
    
2. Functional Requirements (Recap)
    
3. High-Level Architecture
    
4. Monorepo Project Structure
    
5. Chrome Extension (Frontend)
    
    * Manifest
        
    * Configuration UI
        
    * Storage Schema
        
    * Background Service Worker
        
    * Content Scripts
        
    * Collectors
        
    * Popup Chat UI
        
    * Chrome Built-in AI Integration
        
    * Icon Color State
        
6. Node Server (Backend)
    
    * Tech Stack
        
    * Directory Layout
        
    * Database Schema (PostgreSQL)
        
    * S3 Storage Layout
        
    * REST API Contracts
        
7. End-to-End Flows
    
8. Configuration & Environment
    
9. Build, Run & Deploy
    
10. Testing Strategy
    
11. Performance Guidelines
    
12. Security & Privacy
    
13. Logging & Observability
    
14. Edge Cases & Error Handling
    
15. Developer Checklists
    
16. Roadmap (Post-MVP)
    

* * *

## Overview

**DevaDoot** is a Chrome extension plus Node.js backend that continuously monitors user-configured websites and URL patterns. It evaluates **natural-language rules** to trigger an **external agent** (marketplace or custom URL). On a rule match, it:

* Creates a **Case ID** in the backend,
    
* Runs selected **collectors** (HAR, console logs, DOM snapshot, cookies, perf, memory, screenshot, optional tab recording),
    
* Uploads artifacts to **S3** under that Case ID, stores metadata in DB,
    
* Turns the extension icon **green**,
    
* Opens an in-page **chat popup** connected to the chosen external agent, showing a **Welcome Message**,
    
* Provides **popup controls**: **Minimize**, **Close Popup**, **End Support** (no “continue chat”).
    

Rules can be matched from **UI changes** (via MutationObserver in SPAs) or **API activity** (via fetch/XHR observers). **Chrome built-in AI** is used locally for rule parsing and lightweight semantic matching, with the backend as the authoritative matcher.

* * *

## Functional Requirements (Recap)

* **Two components**: Chrome Extension (frontend) + Node Server (backend).
    
* **Continuous monitoring** on configured sites & URL patterns.
    
* **Monitoring types** (per agent): `UI`, `API`, or `Both`.
    
* **Rules** are written in **natural language** by the user.
    
* **Chrome built-in AI** used to parse rules and assist in matching.
    
* On match:
    
    * Create **Case ID** via backend and display it in popup.
        
    * Run **Collectors** and upload to S3 via backend API.
        
    * Open **chat popup** (with **Welcome Message**).
        
    * Turn extension icon **green**.
        
* **Popup controls**: **Minimize**, **Close Popup** (ends UI & session), **End Support** (ends UI, session, and closes case).
    
* **Marketplace/Custom Agent** selection in configuration UI.
    
* Backend stores agents, rules, cases, artifacts; serves marketplace data; evaluates rules.
    

* * *

## High-Level Architecture

```
+-------------------+           HTTPS/WSS           +--------------------+
|   Chrome Browser  | <---------------------------> |    External Agent  |
|  (Extension + UI) |                               | (chat/analysis API)|
+---------+---------+                               +----------+---------+
          |                                                    ^
          | HTTPS (REST, uploads)                              |
          v                                                    |
+---------+----------------------------------------------------+---------+
|                            Node Server (API)                           |
|  - Agent configs & matching     - Rule evaluation (authoritative)      |
|  - Case creation & persistence  - S3 uploads & artifact indexing       |
|  - Marketplace aggregation      - Token issuance (optional)            |
+----------------------+-------------------------+-----------------------+
                       |                         |
                       v                         v
                   PostgreSQL                  S3 Bucket
               (agents, rules, cases)   (cases/{caseId}/artifacts)
```

* * *

## Monorepo Project Structure

```
DevaDoot/
├─ README.md
├─ LICENSE
├─ package.json                # root scripts (lint, format, build)
├─ pnpm-lock.yaml | package-lock.json
├─ .editorconfig
├─ .gitignore
├─ .env.example
├─ docker-compose.yml          # local dev: postgres + minio (S3)
│
├─ extension/                  # Chrome extension (MV3, TS, React, Vite)
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ vite.config.ts
│  ├─ public/
│  │  └─ icons/gray-*.png, green-*.png
│  ├─ src/
│  │  ├─ manifest.json
│  │  ├─ bg/
│  │  │  ├─ service-worker.ts
│  │  │  └─ api-client.ts
│  │  ├─ content/
│  │  │  ├─ monitor-ui.ts
│  │  │  ├─ monitor-api.ts
│  │  │  └─ popup-injector.ts
│  │  ├─ popup/                # in-page chat iframe app
│  │  │  ├─ index.html
│  │  │  ├─ index.tsx
│  │  │  ├─ App.tsx
│  │  │  └─ styles.css
│  │  ├─ options/              # configuration UI (tabs)
│  │  │  ├─ index.html
│  │  │  ├─ index.tsx
│  │  │  ├─ App.tsx
│  │  │  └─ components/
│  │  ├─ lib/
│  │  │  ├─ ai.ts              # Chrome AI wrapper
│  │  │  ├─ rules.ts           # NL->JSON, schema, validation
│  │  │  ├─ debounce.ts
│  │  │  ├─ messagebus.ts      # runtime messaging helpers
│  │  │  └─ collectors.ts      # orchestrator interfaces
│  │  └─ types/
│  │     └─ index.ts
│  └─ tailwind.config.js
│
└─ server/                     # Node backend (Express + TS + Prisma)
   ├─ package.json
   ├─ tsconfig.json
   ├─ prisma/
   │  ├─ schema.prisma
   │  └─ migrations/
   ├─ src/
   │  ├─ index.ts              # bootstrap
   │  ├─ env.ts
   │  ├─ server.ts             # express app
   │  ├─ db.ts                 # prisma client
   │  ├─ s3.ts                 # S3 client & upload helpers
   │  ├─ auth/
   │  │  └─ middleware.ts
   │  ├─ routes/
   │  │  ├─ agents.ts          # marketplace & matching
   │  │  ├─ events.ts          # /events/visit
   │  │  ├─ rules.ts           # /rules/evaluate/ui|api
   │  │  ├─ cases.ts           # create/close/list
   │  │  └─ uploads.ts         # /cases/:caseId/upload
   │  ├─ services/
   │  │  ├─ ruleEngine.ts      # NL->structured, deterministic checks, scoring
   │  │  ├─ matching.ts        # site/url pattern matching
   │  │  ├─ cases.ts
   │  │  ├─ artifacts.ts
   │  │  └─ marketplace.ts
   │  ├─ types/
   │  │  └─ api.ts
   │  └─ utils/
   │     ├─ logger.ts
   │     └─ error.ts
   └─ openapi.yaml             # optional OpenAPI spec
```

* * *

## Chrome Extension (Frontend)

### Manifest

```json
{
  "manifest_version": 3,
  "name": "DevaDoot",
  "version": "1.0.0",
  "action": { "default_title": "DevaDoot" },
  "icons": { "16": "icons/gray-16.png", "32": "icons/gray-32.png", "48": "icons/gray-48.png", "128": "icons/gray-128.png" },
  "background": { "service_worker": "bg/service-worker.js", "type": "module" },
  "options_ui": { "page": "options/index.html", "open_in_tab": true },
  "permissions": ["storage", "tabs", "scripting", "cookies", "activeTab", "tabCapture", "webRequest"],
  "host_permissions": ["*://*/*"],
  "content_scripts": [
    { "matches": ["<all_urls>"], "js": ["content/monitor-ui.js", "content/monitor-api.js"], "run_at": "document_idle" }
  ],
  "web_accessible_resources": [{
    "resources": ["popup/index.html", "popup/*", "icons/*"],
    "matches": ["<all_urls>"]
  }],
  "minimum_chrome_version": "127"
}
```

### Configuration UI

* **Left Tabs**: `+ Create New Agent`, then one tab per saved agent.
    
* **Right Form** (per agent):
    
    * `Agent Name` (text)
        
    * `Sites to Monitor` (list of hostnames/URLs)
        
    * `URL Patterns` (regex list)
        
    * `Agent Source`: Marketplace | Custom URL
        
    * `Marketplace Selector` or `Custom Agent URL`
        
    * `Monitoring Type`: UI | API | Both
        
    * `Agent Invocation Rule` (multiline NL)
        
    * `Welcome Message` (multiline)
        
    * `Collectors` (checkboxes): har, console, cookies, dom, memory, performance, screenshot, screenRecording
        
    * Save → persist to `chrome.storage.sync`.
        

### Storage Schema

```ts
export type AgentConfig = {
  id: string;
  name: string;
  sites: string[];
  urlPatterns: string[];
  source: "marketplace" | "custom";
  marketplaceId?: string;
  customEndpoint?: string;
  monitoring: "UI" | "API" | "Both";
  ruleNL: string;
  ruleStructured?: any;          // cached
  welcomeMessage: string;
  collectors: {
    har: boolean; console: boolean; cookies: boolean; dom: boolean;
    memory: boolean; performance: boolean; screenshot: boolean; screenRecording: boolean;
  };
  priority?: number;             // lower = earlier
};
```

### Background Service Worker

Responsibilities:

* On tab URL change/activation → `POST /events/visit` (`{url, tabId}`) → receive agent matches and rules → send config to content scripts.
    
* Maintain per-tab agent state, and **icon color** state (green on match).
    
* Orchestrate **Collectors** after server confirms a match & case created.
    
* **Inject popup** and send case, welcome message, and agent chat metadata.
    
* **AI usage**: parse rule NL to JSON on save; optional local pre-check matcher.
    
* **Messaging** with content scripts and popup iframe via `chrome.runtime`.
    

### Content Scripts

#### UI Monitor (`monitor-ui.ts`)

* Install `MutationObserver` on scoped container (prefer known app nodes over entire `body`).
    
* Config: `{ childList: true, characterData: true, subtree: true }`.
    
* Debounce (150–300 ms). Extract readable text from added nodes (truncate).
    
* Send to background: `{type:"ui-sample", agentId, url, textSample}`.
    

#### API Monitor (`monitor-api.ts`)

* Wrap `window.fetch` and `XMLHttpRequest`:
    
    * Capture `{url, method, status, bodySnippet, duration}` (truncate, redact).
        
* Send to background: `{type:"api-sample", agentId, url, summary}`.
    

> **Never** break app behavior; always return original response.

### Collectors

* **HAR (deep)**: `chrome.debugger` attach → Network events → assemble HAR → detach within 5–10s.
    
* **HAR (lite)**: synthesize from API monitor + `performance.getEntriesByType('resource')`.
    
* **Console**: buffer `window.onerror`, `unhandledrejection`, shadow console methods.
    
* **Cookies**: `chrome.cookies.getAll({url})` (mask sensitive names).
    
* **DOM**: `document.documentElement.outerHTML` → strip scripts/styles → gzip → cap size.
    
* **Memory**: `performance.memory` (if available).
    
* **Performance**: `performance.getEntriesByType('navigation')`.
    
* **Screenshot**: `chrome.tabs.captureVisibleTab`.
    
* **Screen Recording**: `chrome.tabCapture.capture` (user consent) 5–10s WebM.
    

Upload all via `POST /cases/:caseId/upload` (server writes to S3).

### Popup Chat UI

* Injected as **iframe** (`chrome.runtime.getURL("popup/index.html")`).
    
* **Header**: Agent name, **Case ID**, controls:
    
    * **🗕 Minimize**: collapse to a small floating pill; session remains active.
        
    * **🗙 Close Popup**: close UI and **end session**.
        
    * **🔌 End Support**: end session and **POST /cases/:caseId/close**.
        
* **Body**: messages; first message is **Welcome Message** (from config; overrides agent default).
    
* **Input**: user messages; delivery via agent chat endpoint (WSS preferred).
    

### Chrome Built-in AI Integration

* Feature detection in `lib/ai.ts`:
    

```ts
export async function aiAvailable() {
  return Boolean((chrome as any).ai?.languageModel?.generate);
}
export async function parseRuleNLtoJSON(nl: string): Promise<any | null> {
  if (!(await aiAvailable())) return null;
  const prompt = `Convert this rule into structured JSON triggers.
Rule: """${nl}"""
Respond with **only** JSON.`;
  const out = await (chrome as any).ai.languageModel.generate({ prompt });
  return safeJson(out?.text);
}
export async function localMatchHint(ruleNL: string, sample: string): Promise<boolean | null> {
  if (!(await aiAvailable())) return null;
  const prompt = `Does this observed text satisfy the intent of the rule?
Rule: """${ruleNL}"""
Text: """${sample}"""
Answer exactly: true or false.`;
  const out = await (chrome as any).ai.languageModel.generate({ prompt });
  return /^true$/i.test((out?.text || "").trim());
}
```

* Use **only as a hint**; backend is authoritative.
    

### Icon Color State

* Default **gray**.
    
* On confirmed match for a tab (after Case created) → set **green** for that tab.
    
* Reset to gray when tab navigates away or case is closed.
    

* * *

## Node Server (Backend)

### Tech Stack

* Node.js + TypeScript
    
* Express (HTTP server)
    
* Prisma (ORM) + PostgreSQL
    
* AWS SDK (S3) — MinIO for local dev
    
* Zod/JOI for request validation
    
* Pino (logging)
    

### Directory Layout

(see monorepo tree above)

### Database Schema (PostgreSQL) — Prisma

```prisma
model Agent {
  id              String   @id @default(uuid())
  name            String
  source          AgentSource
  marketplaceId   String?
  customEndpoint  String?
  monitoring      MonitoringType
  welcomeMessage  String   @default("")
  ruleNL          String
  ruleStructured  Json?
  collectors      Json     // {har:true,...}
  priority        Int      @default(100)
  sites           AgentSite[]
  patterns        AgentUrlPattern[]
  cases           Case[]
  createdAt       DateTime @default(now())
}

model AgentSite {
  agentId String
  site    String
  agent   Agent   @relation(fields: [agentId], references: [id], onDelete: Cascade)
  @@id([agentId, site])
}

model AgentUrlPattern {
  agentId String
  pattern String
  agent   Agent   @relation(fields: [agentId], references: [id], onDelete: Cascade)
  @@id([agentId, pattern])
}

model Case {
  id           String   @id @default(uuid())
  agent        Agent?   @relation(fields: [agentId], references: [id])
  agentId      String?
  url          String
  site         String
  ruleSnapshot Json
  status       CaseStatus @default(open)
  artifacts    Artifact[]
  createdAt    DateTime  @default(now())
  closedAt     DateTime?
}

model Artifact {
  id        String   @id @default(uuid())
  case      Case     @relation(fields: [caseId], references: [id], onDelete: Cascade)
  caseId    String
  kind      String
  s3Key     String
  s3Url     String
  sizeBytes BigInt?
  createdAt DateTime @default(now())
}

model MarketplaceAgent {
  id          String @id
  name        String
  type        String
  description String?
  chatEndpoint String?
}

enum AgentSource { marketplace custom }
enum MonitoringType { UI API Both }
enum CaseStatus { open closed }
```

### S3 Storage Layout

```
s3://<bucket>/cases/<caseId>/
  har.json
  console.jsonl
  dom.html.gz
  cookies.json
  memory.json
  perf.json
  screenshot.png
  recording.webm
```

### REST API Contracts

All endpoints require `Authorization: Bearer <token>`.

#### 1) `POST /events/visit`

Request:

```json
{ "url": "https://mail.google.com/mail/u/0/", "tabId": 123 }
```

Response:

```json
{
  "matches": [
    {
      "agentId": "uuid",
      "name": "Gmail-Forward-Monitor",
      "monitoring": "Both",
      "rule": { "nl": "If message forwarded to abcd.com ...", "structured": { } },
      "welcomeMessage": "Sorry for causing this error. We are investigating.",
      "collectors": { "har": true, "console": true, "cookies": false, "dom": true, "memory": false, "performance": true, "screenshot": true, "screenRecording": false },
      "agentSource": "marketplace",
      "agentChatMeta": { "type": "chat", "endpoint": "wss://agent.example/chat" }
    }
  ]
}
```

#### 2) `POST /rules/evaluate/ui`

Request:

```json
{
  "agentId": "uuid",
  "textSample": "Message forwarded to abcd.com",
  "ruleNL": "If any message is forwarded to abcd.com, invoke agent",
  "ruleStructured": {},
  "url": "https://mail.google.com/"
}
```

Response:

```json
{ "match": true, "score": 0.92, "reason": "contains abcd.com forwarded indicator" }
```

#### 3) `POST /rules/evaluate/api`

Request:

```json
{
  "agentId": "uuid",
  "request": { "method": "POST", "url": "/api/forward", "bodySnippet": "..." },
  "response": { "status": 404, "bodySnippet": "..." },
  "ruleNL": "If 404 or forwarding target is abcd.com then invoke",
  "ruleStructured": {},
  "url": "https://app.example/"
}
```

Response:

```json
{ "match": false, "score": 0.41, "reason": "no forwarding target detected" }
```

#### 4) `POST /cases`

Request:

```json
{
  "agentId": "uuid",
  "url": "https://mail.google.com/",
  "site": "mail.google.com",
  "ruleSnapshot": { "nl": "If message forwarded to abcd.com...", "structured": {} }
}
```

Response:

```json
{ "caseId": "uuid-case-123" }
```

#### 5) `POST /cases/:caseId/upload` (multipart/form-data)

Fields: `kind` (string), `file` (binary) _or_ `json` (string)  
Response:

```json
{
  "artifactId":"uuid-art-1",
  "s3Key":"cases/uuid-case-123/har.json",
  "s3Url":"https://s3.amazonaws.com/bucket/cases/uuid-case-123/har.json"
}
```

#### 6) `POST /cases/:caseId/close`

Response:

```json
{ "ok": true }
```

#### 7) `GET /agents/marketplace`

Response:

```json
[
  { "id":"chat-support-ai","name":"Chat Support AI","type":"chat","description":"Live support","chatEndpoint":"wss://..." }
]
```

#### 8) `GET /agents/match?site=<hostname>`

Response:

```json
{ "matches": [ { "agentId":"uuid","name":"...","monitoring":"UI","rule":{...} } ] }
```

* * *

## End-to-End Flows

### A) Visit → Match → Case → Collectors → Popup

1. Extension detects URL → `POST /events/visit`.
    
2. Server returns matching agents.
    
3. Content scripts start monitoring (UI/API).
    
4. Sample generated → `POST /rules/evaluate/ui|api`.
    
5. If `match=true` → `POST /cases` → receive `caseId`.
    
6. Set icon **green**; run **collectors** → upload artifacts.
    
7. Inject **popup**, show **Welcome Message** & **Case ID**, connect to agent chat.
    

### B) Popup Controls

* **Minimize** → collapse UI but session remains active.
    
* **Close Popup** → close UI and **end session** (disconnect).
    
* **End Support** → end session and **close case** on backend.
    

* * *

## Configuration & Environment

### `.env.example` (server)

```
PORT=8080
NODE_ENV=development

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/devadoot
JWT_SECRET=replace_me

S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=devadoot
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_FORCE_PATH_STYLE=true  # for MinIO

CORS_ORIGINS=http://localhost:5173,chrome-extension://*
```

### Docker Compose (local dev)

```yaml
version: "3.9"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: devadoot
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
  minio:
    image: minio/minio:latest
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    ports: ["9000:9000", "9001:9001"]
    volumes: ["miniodata:/data"]
volumes:
  pgdata:
  miniodata:
```

* * *

## Build, Run & Deploy

### Extension (dev)

* `cd extension`
    
* `pnpm i` (or `npm i`)
    
* `pnpm dev` (Vite) → load `dist/` as unpacked extension in Chrome.
    
* Build: `pnpm build`
    

### Server (dev)

* `cd server`
    
* `pnpm i`
    
* `pnpm prisma migrate dev`
    
* `pnpm dev` (ts-node / nodemon)
    

### Production

* Server: build `pnpm build` → run with PM2/Docker; ensure HTTPS termination.
    
* Extension: package and submit to Chrome Web Store (MV3); set minimum Chrome version aligned with AI APIs.
    

* * *

## Testing Strategy

### Unit Tests

* Rule parsing (with/without AI available).
    
* UI monitor extraction + debounce.
    
* API monitor wrappers (no functional break).
    
* Collectors (mock chrome.*).
    
* Popup state machine (minimize/close/end).
    

### Integration Tests

* `/events/visit` → agent matches.
    
* `/rules/evaluate/*` decisions.
    
* `/cases` create/close; `/cases/:id/upload` S3 write.
    

### E2E Scenarios

1. **Gmail forwarding (UI rule)** → match → case → collectors → popup.
    
2. **SPA 404 (API rule)** → match → case → collectors → popup.
    
3. **Popup controls** behavior & server case closure.
    

* * *

## Performance Guidelines

* **UI**: Use scoped MutationObserver; avoid `body` if possible.
    
* **Debounce** 150–300 ms; coalesce multiple mutations.
    
* **API**: Throttle summaries (e.g., ≤ 10/sec per tab).
    
* **Backpressure**: cache negative matches for repeated identical samples for 5 min.
    
* **Collectors**: limit sizes (DOM gzip cap ~2 MB; recording 5–10 s).
    
* **Debugger**: attach only for HAR window; detach promptly.
    

* * *

## Security & Privacy

* **Permissions minimization** in manifest; host permissions only as needed.
    
* **User consent** for screen/tab capture.
    
* **HTTPS/WSS only** for agent endpoints.
    
* **Sanitize** all user/agent messages; never `eval`.
    
* **PII**: mask cookies/secrets; redact known headers.
    
* **Tokens**: short-lived Bearer; optional per-session chat tokens.
    
* **CSP** for popup iframe; sandbox attributes.
    

* * *

## Logging & Observability

* **Server**: Pino logs with requestId, caseId, artifactId.
    
* **Metrics**: basic counters (matches, cases, uploads, errors).
    
* **Tracing** (optional): OpenTelemetry.
    

* * *

## Edge Cases & Error Handling

* Multiple agents match: respect `priority` (lowest wins) or fan-out (config flag).
    
* Server unavailable: run monitors; **no popup** until confirmation; bounded retry queue.
    
* Large payloads: summarize/truncate before evaluation.
    
* Agent chat endpoint failure: show user notice; keep case open; retry backoff.
    
* Welcome Message precedence: extension config overrides agent default.
    

* * *

## Developer Checklists

**Extension**

*  Manifest MV3 valid; permissions minimal.
    
*  Options UI: create/edit agents; persist to `storage.sync`.
    
*  Background: visit notify → monitor start → match cycle.
    
*  UI monitor: scoped, debounced, truncated samples.
    
*  API monitor: safe wrappers, redaction.
    
*  Collectors: gated by selection; size caps; upload via backend.
    
*  Popup: iframe, Case ID, Welcome Message, **Minimize / Close / End Support**.
    
*  Icon color handling per tab.
    
*  Chrome AI: feature detection, graceful fallback.
    

**Server**

*  DB migrations applied.
    
*  `/events/visit` returns correct matches by site/pattern.
    
*  `/rules/evaluate/ui|api` deterministic checks + optional semantic scoring.
    
*  `/cases` create; `/cases/:id/upload` S3; `/cases/:id/close`.
    
*  Marketplace endpoints wired.
    
*  Auth, CORS, logging, error handling.
    

* * *

## Roadmap (Post-MVP)

* Embedding-based semantic matching in backend.
    
* Multi-agent simultaneous invocation (single popup).
    
* Voice chat (WebRTC) & file attachments.
    
* GitHub/Jira ticket integration from cases.
    
* Auto-summaries of chats and artifacts.
    
* Theming per agent.
    

* * *

### Key Code Stubs (for quick start)

**extension/src/bg/service-worker.ts**

```ts
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;
  const res = await api.post("/events/visit", { url: tab.url, tabId });
  for (const m of res.matches || []) {
    chrome.tabs.sendMessage(tabId, { type: "start-monitor", match: m });
  }
});

chrome.runtime.onMessage.addListener(async (msg, sender) => {
  if (!sender.tab?.id) return;
  if (msg.type === "ui-sample" || msg.type === "api-sample") {
    const evalUrl = msg.type === "ui-sample" ? "/rules/evaluate/ui" : "/rules/evaluate/api";
    const ev = await api.post(evalUrl, msg.payload);
    if (!ev.match) return;

    const { caseId } = await api.post("/cases", msg.caseInit);
    await chrome.action.setIcon({ path: "icons/green-32.png", tabId: sender.tab.id });

    await runCollectorsAndUpload(caseId, sender.tab.id, msg.url, msg.collectors);
    await injectPopup(sender.tab.id, { caseId, welcome: msg.welcome, chat: msg.chatMeta });
  }
});
```

**server/src/routes/events.ts**

```ts
router.post("/events/visit", auth, async (req, res) => {
  const { url } = req.body;
  const { hostname } = new URL(url);
  const matches = await matching.findAgentsBySiteOrPattern(hostname, url);
  res.json({ matches });
});
```

**server/src/routes/rules.ts**

```ts
router.post("/rules/evaluate/ui", auth, async (req, res) => {
  const { agentId, textSample, ruleNL, ruleStructured, url } = req.body;
  const result = await ruleEngine.evaluateUI({ agentId, textSample, ruleNL, ruleStructured, url });
  res.json(result);
});
router.post("/rules/evaluate/api", auth, async (req, res) => {
  const { agentId, request, response, ruleNL, ruleStructured, url } = req.body;
  const result = await ruleEngine.evaluateAPI({ agentId, request, response, ruleNL, ruleStructured, url });
  res.json(result);
});
```

**server/src/routes/cases.ts**

```ts
router.post("/cases", auth, async (req, res) => {
  const { agentId, url, site, ruleSnapshot } = req.body;
  const c = await cases.create(agentId, url, site, ruleSnapshot);
  res.json({ caseId: c.id });
});
router.post("/cases/:id/close", auth, async (req, res) => {
  await cases.close(req.params.id);
  res.json({ ok: true });
});
```

**server/src/routes/uploads.ts**

```ts
router.post("/cases/:id/upload", auth, upload.single("file"), async (req, res) => {
  const caseId = req.params.id;
  const kind = req.body.kind;
  const buffer = req.file ? req.file.buffer : Buffer.from(req.body.json || "", "utf8");
  const key = `cases/${caseId}/${kind}-${Date.now()}`;
  const s3Url = await s3.putObject(key, buffer, req.file?.mimetype || "application/json");
  const art = await artifacts.record(caseId, kind, key, s3Url, buffer.length);
  res.json({ artifactId: art.id, s3Key: key, s3Url });
});
```