import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { UserService } from '../services/user.service.js';
import { updateUserSchema, type UpdateUserInput } from '../models/User.js';
import { authenticate } from '../middleware/authenticate.js';

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
};

export default usersRoutes;
