/**
 * Express application setup
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './env';
import { logger } from './utils/logger';
import { errorHandler } from './utils/error';

// Import routes
import { eventsRouter } from './routes/events';
import { rulesRouter } from './routes/rules';
import { casesRouter } from './routes/cases';
import { createUploadsRouter } from './routes/uploads';
import { agentsRouter } from './routes/agents';

export function createApp() {
  const app = express();

  // Middleware
  app.use(helmet());
  app.use(cors({
    origin: env.CORS_ORIGINS,
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(pinoHttp({ logger }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes with /api prefix
  app.use('/api/events', eventsRouter);
  app.use('/api/rules', rulesRouter);
  app.use('/api/cases', casesRouter);
  app.use('/api/cases', createUploadsRouter());
  app.use('/api/agents', agentsRouter);

  // Error handling
  app.use(errorHandler);

  return app;
}
