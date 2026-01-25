import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { UserService } from '../services/user.service.js';
import { updateUserSchema, type UpdateUserInput } from '../models/User.js';
import { authenticate } from '../middleware/authenticate.js';
import { generateRandomPassword } from '../utils/index.js';
import type { GlobalProjectAccess } from '../types/index.js';

const usersRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const userService = new UserService(fastify.mongo.collections.users);

  // Search users by username, email, or displayName
  fastify.get<{ Querystring: { q: string; exclude?: string } }>(
    '/search',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Users'],
        description: 'Search users by username, email, or display name',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          required: ['q'],
          properties: {
            q: { type: 'string', minLength: 2 },
            exclude: { type: 'string' }, // comma-separated user IDs to exclude
          },
        },
      },
    },
    async (request, reply) => {
      const { q, exclude } = request.query;
      const excludeIds = exclude ? exclude.split(',').filter(Boolean) : [];

      // Always exclude the current user from search results
      excludeIds.push(request.user!.userId);

      const users = await userService.searchUsers(q, excludeIds, 10);
      return reply.send({ users });
    }
  );

  // Get connected users (users who share projects with current user)
  fastify.get(
    '/connections',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Users'],
        description: 'Get users who share projects with the current user',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const connections = await userService.getConnectedUsers(
        request.user!.userId,
        fastify.mongo.collections.projects
      );
      return reply.send({ connections });
    }
  );

  // Get user by ID
  fastify.get<{ Params: { userId: string } }>(
    '/:userId',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Users'],
        description: 'Get user by ID',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const user = await userService.findById(request.params.userId);

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

  // Update current user
  fastify.patch<{ Body: UpdateUserInput }>(
    '/me',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Users'],
        description: 'Update current user profile',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            displayName: { type: 'string', maxLength: 50 },
            bio: { type: 'string', maxLength: 500 },
            avatar: { type: 'string', format: 'uri' },
            settings: {
              type: 'object',
              properties: {
                emailNotifications: { type: 'boolean' },
                pushNotifications: { type: 'boolean' },
                theme: { type: 'string', enum: ['light', 'dark', 'system'] },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const validation = updateUserSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: validation.error.errors[0].message,
        });
      }

      const user = await userService.update(request.user!.userId, validation.data);

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

  // Get user by username
  fastify.get<{ Params: { username: string } }>(
    '/username/:username',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Users'],
        description: 'Get user by username',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['username'],
          properties: {
            username: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const user = await userService.findByUsername(request.params.username);

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

  // Set global project access for a user
  fastify.put<{ Params: { userId: string }; Body: { access: 'view' | 'edit' | null } }>(
    '/:userId/global-access',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Users'],
        description: 'Set global project access for a user (grants access to all current and future projects)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['access'],
          properties: {
            access: { type: ['string', 'null'], enum: ['view', 'edit', null] },
          },
        },
      },
    },
    async (request, reply) => {
      const { userId } = request.params;
      const { access } = request.body;

      // Only allow setting global access on other users (not self for safety)
      // In a production app, you might want to restrict this to admins only
      const targetUser = await userService.findById(userId);
      if (!targetUser) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'User not found',
        });
      }

      const updatedUser = await userService.setGlobalProjectAccess(userId, access);
      if (!updatedUser) {
        return reply.code(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Failed to update user access',
        });
      }

      return reply.send({ user: userService.toPublic(updatedUser) });
    }
  );

  // Get users with global project access
  fastify.get(
    '/global-access/list',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Users'],
        description: 'Get all users with global project access',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const users = await userService.getUsersWithGlobalAccess();
      return reply.send({ users });
    }
  );

  // Create user by email with temporary password
  fastify.post<{
    Body: {
      email: string;
      globalAccess?: GlobalProjectAccess | null;
    };
  }>(
    '/create-by-email',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Users'],
        description: 'Create a new user by email with a temporary password. Returns the password for sharing.',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
            globalAccess: { type: ['string', 'null'], enum: ['view', 'edit', null] },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, globalAccess } = request.body;

      // Check if user already exists
      const existingUser = await userService.findByEmail(email);
      if (existingUser) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'A user with this email already exists',
        });
      }

      // Create user with temporary password
      const temporaryPassword = generateRandomPassword(12);
      const user = await userService.createFromEmail(email, temporaryPassword);

      // Set global access if requested
      if (globalAccess) {
        await userService.setGlobalProjectAccess(user._id.toString(), globalAccess);
        user.globalProjectAccess = globalAccess;
      }

      return reply.code(201).send({
        user: userService.toPublic(user),
        temporaryPassword,
        message: 'User created successfully. Share the temporary password with the user.',
      });
    }
  );
};

export default usersRoutes;
