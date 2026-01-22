import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { jwtConfig } from '../config/index.js';
import type { JwtPayload, RequestUser } from '../types/index.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: RequestUser;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  await fastify.register(fastifyJwt, {
    secret: jwtConfig.secret,
  });

  fastify.decorate('generateAccessToken', function (userId: string, username: string): string {
    return fastify.jwt.sign(
      { userId, username, type: 'access' } as JwtPayload,
      { expiresIn: jwtConfig.accessTokenExpiry }
    );
  });

  fastify.decorate('generateRefreshToken', function (userId: string, username: string): string {
    return fastify.jwt.sign(
      { userId, username, type: 'refresh' } as JwtPayload,
      { expiresIn: jwtConfig.refreshTokenExpiry }
    );
  });
};

declare module 'fastify' {
  interface FastifyInstance {
    generateAccessToken: (userId: string, username: string) => string;
    generateRefreshToken: (userId: string, username: string) => string;
  }
}

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['mongodb'],
});
