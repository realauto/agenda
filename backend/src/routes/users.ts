import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { UserService } from '../services/user.service.js';
import { updateUserSchema, type UpdateUserInput } from '../models/User.js';
import { authenticate } from '../middleware/authenticate.js';

const usersRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const userService = new UserService(fastify.mongo.collections.users);

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
