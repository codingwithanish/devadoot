# Contributing to DevaDoot

Thank you for your interest in contributing to DevaDoot! This document provides guidelines and instructions for contributing to the project.

## Development Setup

Please follow the [SETUP.md](./SETUP.md) guide to set up your development environment.

## Project Structure

```
DevaDoot/
├── extension/          # Chrome Extension (MV3, React, TypeScript)
│   ├── src/
│   │   ├── bg/        # Background service worker
│   │   ├── content/   # Content scripts
│   │   ├── lib/       # Shared utilities
│   │   ├── options/   # Configuration UI
│   │   ├── popup/     # Chat popup UI
│   │   └── types/     # TypeScript types
│   └── public/        # Static assets
│
└── server/            # Node.js Backend (Express, Prisma, PostgreSQL)
    ├── src/
    │   ├── routes/    # API routes
    │   ├── services/  # Business logic
    │   ├── utils/     # Utilities
    │   └── types/     # TypeScript types
    └── prisma/        # Database schema

```

## Code Style

### TypeScript
- Use TypeScript strict mode
- Provide type annotations for function parameters and return values
- Avoid `any` types when possible
- Use interfaces for object shapes

### Formatting
- 2 spaces for indentation
- Single quotes for strings
- Trailing commas in multi-line objects/arrays
- Run `pnpm format` before committing

### Naming Conventions
- Files: `kebab-case.ts`
- Components: `PascalCase.tsx`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Types/Interfaces: `PascalCase`

## Development Workflow

### 1. Branch Strategy
- `main` - Production-ready code
- `develop` - Development branch
- `feature/your-feature` - Feature branches
- `fix/bug-description` - Bug fix branches

### 2. Making Changes

```bash
# Create a feature branch
git checkout -b feature/my-new-feature

# Make your changes
# ...

# Test your changes
pnpm test  # (when tests are implemented)

# Build to ensure no errors
cd extension && pnpm build
cd ../server && pnpm build

# Commit your changes
git add .
git commit -m "Add: Brief description of your changes"

# Push to your fork
git push origin feature/my-new-feature
```

### 3. Commit Messages

Follow conventional commits format:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Examples:
```
feat: Add support for custom agent webhooks
fix: Resolve icon color not updating on match
docs: Update setup instructions for Windows
refactor: Extract rule matching logic to service
```

## Testing

### Manual Testing Checklist

Before submitting a PR, manually test:

- [ ] Extension loads without errors
- [ ] Configuration UI saves and loads agents correctly
- [ ] Monitoring detects configured sites
- [ ] Rules evaluate correctly (UI and API)
- [ ] Cases are created on rule match
- [ ] Collectors run and upload to S3
- [ ] Popup appears and displays correctly
- [ ] Chat messages send/receive
- [ ] Icon colors change appropriately
- [ ] Server handles errors gracefully

### Automated Tests

(Tests to be implemented)

```bash
# Run extension tests
cd extension
pnpm test

# Run server tests
cd server
pnpm test
```

## Adding New Features

### Adding a New Collector

1. Add collector interface to `extension/src/lib/collectors.ts`
2. Implement the collector function
3. Add to `CollectorConfig` type in `extension/src/types/index.ts`
4. Update options UI checkbox list
5. Test with a sample case

### Adding a New API Endpoint

1. Create or update route in `server/src/routes/`
2. Implement service logic in `server/src/services/`
3. Add types to `server/src/types/api.ts`
4. Update extension API client if needed
5. Test with curl or Postman

### Adding a New Monitoring Type

1. Update `MonitoringType` enum in types
2. Implement monitoring logic in content scripts
3. Update rule evaluation logic
4. Add UI controls in options page
5. Test across different scenarios

## Database Changes

When modifying the database schema:

```bash
cd server

# 1. Update prisma/schema.prisma

# 2. Create migration
pnpm prisma migrate dev --name describe_your_changes

# 3. Generate Prisma client
pnpm prisma:generate

# 4. Test the changes
pnpm dev
```

## Documentation

When adding features:
- Update README.md if user-facing
- Update SETUP.md if setup process changes
- Add JSDoc comments to functions
- Update inline code comments

## Pull Request Process

1. **Before submitting:**
   - Test your changes thoroughly
   - Update documentation
   - Run linters: `pnpm lint`
   - Build both projects successfully
   - Ensure no console errors

2. **PR Description should include:**
   - What the PR does
   - Why the change is needed
   - How to test it
   - Screenshots (for UI changes)
   - Related issues (if any)

3. **PR Review:**
   - Address reviewer feedback promptly
   - Keep commits clean and logical
   - Squash commits if requested

4. **After Merge:**
   - Delete your feature branch
   - Pull latest changes from main

## Getting Help

- **Documentation:** See [devadoot.md](./devadoot.md) for complete documentation
- **Setup Issues:** Check [SETUP.md](./SETUP.md)
- **Questions:** Open a GitHub Discussion
- **Bugs:** Open a GitHub Issue with reproduction steps

## Code of Conduct

- Be respectful and constructive
- Welcome newcomers
- Focus on the code, not the person
- Help others learn and grow

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to DevaDoot! 🚀
