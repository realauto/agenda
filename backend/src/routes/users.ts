import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { UserService } from '../services/user.service.js';
import { MemberStatusService } from '../services/memberStatus.service.js';
import { updateUserSchema, type UpdateUserInput } from '../models/User.js';
import { authenticate } from '../middleware/authenticate.js';
import { generateRandomPassword } from '../utils/index.js';
import type { GlobalProjectAccess } from '../types/index.js';

const usersRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const userService = new UserService(fastify.mongo.collections.users);
  const memberStatusService = new MemberStatusService(fastify.mongo.collections.memberStatuses);

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

  // ==================== MEMBER STATUS ROUTES ====================

  // Get status history for a user
  fastify.get<{ Params: { userId: string }; Querystring: { limit?: number } }>(
    '/:userId/statuses',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Users', 'Member Status'],
        description: 'Get status history for a user',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 50 },
          },
        },
      },
    },
    async (request, reply) => {
      const { userId } = request.params;
      const { limit = 50 } = request.query;

      // Check if user exists
      const user = await userService.findById(userId);
      if (!user) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'User not found',
        });
      }

      const statuses = await memberStatusService.getByUserId(userId, limit);

      // Get author details for each status
      const authorIds = [...new Set(statuses.map((s) => s.authorId.toString()))];
      const authors = await userService.findByIds(authorIds);
      const authorMap = new Map(authors.map((a) => [a._id.toString(), userService.toPublic(a)]));

      const statusesWithAuthors = statuses.map((status) => ({
        ...status,
        _id: status._id.toString(),
        userId: status.userId.toString(),
        authorId: status.authorId.toString(),
        author: authorMap.get(status.authorId.toString()),
      }));

      return reply.send({ statuses: statusesWithAuthors });
    }
  );

  // Add a status for a user
  fastify.post<{ Params: { userId: string }; Body: { content: string } }>(
    '/:userId/statuses',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Users', 'Member Status'],
        description: 'Add a status for a user (requires global access)',
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
          required: ['content'],
          properties: {
            content: { type: 'string', minLength: 1, maxLength: 1000 },
          },
        },
      },
    },
    async (request, reply) => {
      const { userId } = request.params;
      const { content } = request.body;
      const authorId = request.user!.userId;

      // Check if author has global access
      const author = await userService.findById(authorId);
      if (!author?.globalProjectAccess) {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Only users with global access can add status updates',
        });
      }

      // Check if target user exists
      const targetUser = await userService.findById(userId);
      if (!targetUser) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'User not found',
        });
      }

      const status = await memberStatusService.create(userId, authorId, content);

      return reply.code(201).send({
        status: {
          ...status,
          _id: status._id.toString(),
          userId: status.userId.toString(),
          authorId: status.authorId.toString(),
          author: userService.toPublic(author),
        },
      });
    }
  );

  // Get latest statuses for all users with global access
  fastify.get(
    '/statuses/latest',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Users', 'Member Status'],
        description: 'Get latest status for all users with global access',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      // Get all users with global access
      const globalUsers = await userService.getUsersWithGlobalAccess();
      const userIds = globalUsers.map((u) => u._id.toString());

      if (userIds.length === 0) {
        return reply.send({ statuses: {} });
      }

      // Get latest statuses
      const statusMap = await memberStatusService.getLatestForUsers(userIds);

      // Get author details
      const authorIds = [...new Set([...statusMap.values()].map((s) => s.authorId.toString()))];
      const authors = await userService.findByIds(authorIds);
      const authorMap = new Map(authors.map((a) => [a._id.toString(), userService.toPublic(a)]));

      // Format response
      const statuses: Record<string, unknown> = {};
      for (const [userId, status] of statusMap) {
        statuses[userId] = {
          ...status,
          _id: status._id.toString(),
          userId: status.userId.toString(),
          authorId: status.authorId.toString(),
          author: authorMap.get(status.authorId.toString()),
        };
      }

      return reply.send({ statuses });
    }
  );

  // Delete a status
  fastify.delete<{ Params: { statusId: string } }>(
    '/statuses/:statusId',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Users', 'Member Status'],
        description: 'Delete a status (only the author can delete)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['statusId'],
          properties: {
            statusId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { statusId } = request.params;
      const userId = request.user!.userId;

      // For now, only allow deletion by users with global access
      const user = await userService.findById(userId);
      if (!user?.globalProjectAccess) {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Only users with global access can delete status updates',
        });
      }

      const deleted = await memberStatusService.delete(statusId);
      if (!deleted) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Status not found',
        });
      }

      return reply.send({ success: true });
    }
  );
};

export default usersRoutes;
