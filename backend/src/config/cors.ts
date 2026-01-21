export const corsConfig = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:8081',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
