import express, { Express } from 'express';
import cors from 'cors';
import { config } from './config';
import { apiRouter } from './routes';
import { notFoundHandler, errorHandler } from './middleware';

export const createApp = (): Express => {
  const app = express();

  // CORS middleware
  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      credentials: true,
    })
  );

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // REST API routes versioned under /api/v1
  app.use(config.API_PREFIX, apiRouter);

  // 404 Handler for undefined routes
  app.use(notFoundHandler);

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
};

export const app = createApp();
