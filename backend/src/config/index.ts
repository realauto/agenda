export { databaseConfig } from './database.js';
export { jwtConfig } from './jwt.js';
export { corsConfig } from './cors.js';

export const serverConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
};

export const rateLimitConfig = {
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
};
