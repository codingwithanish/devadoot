# DevaDoot Setup Guide

This guide will walk you through setting up and running the complete DevaDoot project locally.

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** 18+ and **pnpm** 8+
- **Docker** and **Docker Compose**
- **Chrome** 127+ (for Chrome built-in AI APIs)
- **Git** (for version control)

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Clone the repository (if not already done)
cd DevaDoot

# Install root dependencies
pnpm install
```

### 2. Start Local Services

Start PostgreSQL and MinIO (S3-compatible storage):

```bash
# Start Docker services
docker-compose up -d
#To down docker services
docker compose down -v

# Verify services are running
docker-compose ps
```

You should see:

- PostgreSQL running on `localhost:5432`
- MinIO running on `localhost:9000` (API) and `localhost:9001` (Console)

### 3. Set Up the Backend Server

```bash
cd server

# Copy environment template
cp .env.example .env

# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma:generate

# Run database migrations
pnpm prisma:migrate

# Optional: Seed marketplace with default agents
# This will be done automatically on first run in development mode

# Start the development server
pnpm dev
```

The server will start on `http://localhost:8080`.

### 4. Set Up the Chrome Extension

```bash
cd extension

# Install dependencies
pnpm install

# Start development build (with watch mode)
pnpm dev

# For cleaning the workspace
pnpm clean
```

The extension will be built to `extension/dist/`.

### 5. Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `DevaDoot/extension/dist` folder
5. The DevaDoot extension should now appear in your extensions list

### 6. Configure the Extension

1. Right-click the DevaDoot extension icon and select **Options**
2. Go to the **Settings** tab
3. Configure:
   - **Backend Server URL**: `http://localhost:8080`
   - **Authentication Token**: (leave empty for local development)
4. Click **Save Settings**

### 7. Create Your First Agent

1. In the Options page, go to the **Agents** tab
2. Click **+ Create New Agent**
3. Configure your agent:
   - **Agent Name**: "Gmail Support"
   - **Sites to Monitor**: `mail.google.com`
   - **Agent Source**: Marketplace or Custom
   - **Monitoring Type**: Both (UI & API)
   - **Agent Invocation Rule**: "If any message is forwarded to abcd.com, invoke the agent"
   - **Welcome Message**: "We detected an issue. How can we help?"
   - **Collectors**: Select the data you want to collect (HAR, console, DOM, screenshot, etc.)
4. Click **Save Agent**

## Icon Files

The extension requires icon files in the `extension/public/icons/` directory:

- `gray-16.png`, `gray-32.png`, `gray-48.png`, `gray-128.png` (default state)
- `green-16.png`, `green-32.png`, `green-48.png`, `green-128.png` (active/matched state)

**Note**: These icon files are placeholders and should be created or replaced with actual icon images. You can use any image editor to create simple 16x16, 32x32, 48x48, and 128x128 PNG files.

Quick way to create placeholder icons:

```bash
mkdir -p extension/public/icons
# Use an online tool or image editor to create basic gray and green square icons
# Or use ImageMagick:
convert -size 128x128 xc:gray extension/public/icons/gray-128.png
convert -size 128x128 xc:green extension/public/icons/green-128.png
# Then resize for other dimensions
```

## Testing the Setup

1. Navigate to a configured site (e.g., `mail.google.com`)
2. The extension icon should remain gray
3. Perform an action that matches your rule (e.g., forward a message to abcd.com)
4. The extension icon should turn green
5. A chat popup should appear with the welcome message
6. Artifacts should be uploaded to S3/MinIO

## Accessing Services

### MinIO Console

- URL: `http://localhost:9001`
- Username: `minioadmin`
- Password: `minioadmin`

Browse uploaded artifacts in the `devadoot` bucket.

### Prisma Studio (Database GUI)

```bash
cd server
pnpm prisma:studio
```

Access at `http://localhost:5555` to view and manage database records.

### API Health Check

```bash
curl http://localhost:8080/health
```

Should return: `{"status":"ok","timestamp":"..."}`

## Building for Production

### Extension

```bash
cd extension
pnpm build
```

The production build will be in `extension/dist/`. You can then:

1. Zip the `dist` folder
2. Upload to Chrome Web Store

### Server

```bash
cd server
pnpm build
pnpm start
```

For production deployment:

- Use a proper PostgreSQL instance (not Docker)
- Use AWS S3 or a production-ready object storage
- Set `NODE_ENV=production`
- Use a process manager like PM2 or systemd
- Set up HTTPS/TLS termination (nginx/Caddy)

## Troubleshooting

### Extension not loading

- Make sure you're using Chrome 127+
- Check that `extension/dist` folder exists and contains the built files
- Try removing and re-adding the extension

### Server won't start

- Verify Docker services are running: `docker-compose ps`
- Check database connection in `.env`
- Look for error messages in the terminal

### Icons not showing

- Create placeholder icon files in `extension/public/icons/`
- Rebuild the extension: `pnpm build` or restart `pnpm dev`

### Chat popup not appearing

- Check browser console for errors (F12)
- Verify the rule is matching correctly (check server logs)
- Ensure the agent is configured with a valid endpoint

### Artifacts not uploading

- Check MinIO is running: `docker-compose ps`
- Verify S3 configuration in `server/.env`
- Check server logs for upload errors

## Development Tips

### Hot Reloading

- **Extension**: Run `pnpm dev` for automatic rebuilds on file changes
- **Server**: Run `pnpm dev` for automatic server restart with tsx watch

### Debugging

- **Extension**: Use Chrome DevTools on extension pages
  - Background script: `chrome://extensions/` → DevaDoot → "Inspect views: service worker"
  - Content script: F12 on any monitored page
  - Popup: Right-click popup → Inspect
  - Options: Right-click Options → Inspect

- **Server**: Use Chrome DevTools for Node.js
  ```bash
  node --inspect dist/index.js
  ```

### Database Changes

After modifying `server/prisma/schema.prisma`:

```bash
cd server
pnpm prisma migrate dev --name describe_your_changes
pnpm prisma:generate
```

## Next Steps

- Explore the [complete documentation](./devadoot.md)
- Customize agents for your use cases
- Integrate with external chat agents
- Deploy to production

## Support

For issues or questions:

- Check the [main README](./README.md)
- Review the [complete documentation](./devadoot.md)
- Open an issue on GitHub
