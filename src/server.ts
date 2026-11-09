import { app } from './app';
import { config } from './config';

const server = app.listen(config.PORT, config.HOST, () => {
  console.log(`Prospera Referral API server running on ${config.HOST}:${config.PORT}`);
  console.log(`Environment: ${config.NODE_ENV}`);
  console.log(`Health check: http://${config.HOST}:${config.PORT}${config.API_PREFIX}/health`);
});

const gracefulShutdown = (signal: string) => {
  console.log(`\nReceived ${signal}. Gracefully shutting down...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;
