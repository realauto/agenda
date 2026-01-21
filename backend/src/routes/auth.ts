import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { UserService } from '../services/user.service.js';
import { createUserSchema, loginSchema, type CreateUserInput, type LoginInput } from '../models/User.js';
import { verifyPassword } from '../utils/index.js';
import { authenticate } from '../middleware/authenticate.js';

const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const userService = new UserService(fastify.mongo.collections.users);

  // Register
  fastify.post<{ Body: CreateUserInput }>(
    '/register',
    {
      schema: {
        tags: ['Auth'],
        description: 'Register a new user',
        body: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: { type: 'string', minLength: 3, maxLength: 30 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            displayName: { type: 'string', maxLength: 50 },
          },
        },
      },
    },
    async (request, reply) => {
      const validation = createUserSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: validation.error.errors[0].message,
        });
      }

      const { username, email } = validation.data;

      // Check if user already exists
      if (await userService.emailExists(email)) {
        return reply.code(409).send({
          statusCode: 409,
          error: 'Conflict',
          message: 'Email already registered',
        });
      }

      if (await userService.usernameExists(username)) {
        return reply.code(409).send({
          statusCode: 409,
          error: 'Conflict',
          message: 'Username already taken',
        });
      }

      const user = await userService.create(validation.data);
      const accessToken = fastify.generateAccessToken(user._id.toString(), user.username);
      const refreshToken = fastify.generateRefreshToken(user._id.toString(), user.username);

      return reply.code(201).send({
        user: userService.toPublic(user),
        accessToken,
        refreshToken,
      });
    }
  );

  // Login
  fastify.post<{ Body: LoginInput }>(
    '/login',
    {
      schema: {
        tags: ['Auth'],
        description: 'Login with email and password',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const validation = loginSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: validation.error.errors[0].message,
        });
      }

      const { email, password } = validation.data;

      const user = await userService.findByEmail(email);
      if (!user) {
        return reply.code(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      const isValidPassword = await verifyPassword(password, user.password);
      if (!isValidPassword) {
        return reply.code(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      await userService.updateLastActive(user._id.toString());

      const accessToken = fastify.generateAccessToken(user._id.toString(), user.username);
      const refreshToken = fastify.generateRefreshToken(user._id.toString(), user.username);

      return reply.send({
        user: userService.toPublic(user),
        accessToken,
        refreshToken,
      });
    }
  );

  // Refresh token
  fastify.post<{ Body: { refreshToken: string } }>(
    '/refresh',
    {
      schema: {
        tags: ['Auth'],
        description: 'Refresh access token',
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body;

      try {
        const payload = fastify.jwt.verify<{ userId: string; username: string; type: string }>(refreshToken);

        if (payload.type !== 'refresh') {
          return reply.code(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Invalid token type',
          });
        }

        const user = await userService.findById(payload.userId);
        if (!user) {
          return reply.code(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'User not found',
          });
        }

        const accessToken = fastify.generateAccessToken(user._id.toString(), user.username);
        const newRefreshToken = fastify.generateRefreshToken(user._id.toString(), user.username);

        return reply.send({
          accessToken,
          refreshToken: newRefreshToken,
        });
      } catch {
        return reply.code(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Invalid or expired refresh token',
        });
      }
    }
  );

  // Get current user
  fastify.get(
    '/me',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Auth'],
        description: 'Get current user profile',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const user = await userService.findById(request.user!.userId);

      if (!user) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'User not found',
        });
      }

      return reply.send({ user: userService.toPublic(user) });
    }
  );

  // Logout (client-side token removal, but we acknowledge it)
  fastify.post(
    '/logout',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Auth'],
        description: 'Logout current user',
        security: [{ bearerAuth: [] }],
      },
    },
    async (_request, reply) => {
      return reply.send({ message: 'Logged out successfully' });
    }
  );
};

export default authRoutes;
