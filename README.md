# DevaDoot

**Agent-Orchestrated Monitoring with Interactive Chat**

DevaDoot is a Chrome extension plus Node.js backend that continuously monitors user-configured websites and URL patterns. It evaluates natural-language rules to trigger external agents for support, diagnostics, or custom actions.

## Features

- 🔍 **Continuous Monitoring**: Monitor websites for UI changes and API activity
- 🤖 **AI-Powered Rules**: Natural language rule definitions using Chrome's built-in AI
- 📊 **Rich Data Collection**: HAR files, console logs, DOM snapshots, screenshots, and more
- 💬 **Interactive Chat**: In-page chat popup connected to external agents
- 🎯 **Case Management**: Track and manage support cases with artifact storage
- 🔌 **Extensible**: Marketplace and custom agent support

## Architecture

- **Chrome Extension**: MV3 extension with React UI, content scripts, and background workers
- **Node.js Backend**: Express server with PostgreSQL and S3 storage
- **External Agents**: Configurable marketplace or custom agent endpoints

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Docker and Docker Compose (for local development)
- Chrome 127+ (for built-in AI APIs)

### Local Development

1. Clone the repository:
```bash
git clone <repo-url>
cd DevaDoot
```

2. Start local services (PostgreSQL + MinIO):
```bash
docker-compose up -d
```

3. Set up the server:
```bash
cd server
pnpm install
cp .env.example .env
pnpm prisma migrate dev
pnpm dev
```

4. Set up the extension:
```bash
cd extension
pnpm install
pnpm dev
```

5. Load the extension in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension/dist` folder

## Project Structure

```
DevaDoot/
├─ extension/          # Chrome extension (MV3, TypeScript, React, Vite)
├─ server/            # Node.js backend (Express, Prisma, PostgreSQL)
├─ docker-compose.yml # Local development services
└─ README.md
```

## Documentation

See [devadoot.md](./devadoot.md) for complete documentation including:
- Architecture details
- API contracts
- Configuration options
- Testing strategy
- Security guidelines

## License

See LICENSE file for details.

## Version

1.0.0 - Initial Release (2025-10-29)
