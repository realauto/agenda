import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ObjectId } from 'mongodb';
import { FeedService } from '../services/feed.service.js';
import { ProjectService } from '../services/project.service.js';
import { TeamService } from '../services/team.service.js';
import { UserService } from '../services/user.service.js';
import {
  createUpdateSchema,
  updateUpdateSchema,
  addReactionSchema,
  addCommentSchema,
  updateCommentSchema,
  feedQuerySchema,
  type CreateUpdateInput,
  type UpdateUpdateInput,
  type AddReactionInput,
  type AddCommentInput,
  type UpdateCommentInput,
  type FeedQueryInput,
} from '../models/Update.js';
import { authenticate } from '../middleware/authenticate.js';

const updatesRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const feedService = new FeedService(fastify.mongo.collections.updates, fastify.mongo.collections.users);
  const projectService = new ProjectService(fastify.mongo.collections.projects);
  const teamService = new TeamService(fastify.mongo.collections.teams);
  const userService = new UserService(fastify.mongo.collections.users);

  // Create update
  fastify.post<{ Body: CreateUpdateInput }>(
    '/updates',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Updates'],
        description: 'Create a new update',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['projectId', 'content'],
          properties: {
            projectId: { type: 'string' },
            content: { type: 'string', minLength: 1, maxLength: 5000 },
            category: { type: 'string', enum: ['progress', 'blocker', 'bug', 'feature', 'milestone', 'general'] },
            mood: { type: 'string', enum: ['positive', 'neutral', 'negative', 'urgent'] },
            attachments: {
              type: 'array',
              maxItems: 10,
              items: {
                type: 'object',
                required: ['type', 'url', 'name'],
                properties: {
                  type: { type: 'string', enum: ['image', 'file', 'link'] },
                  url: { type: 'string', format: 'uri' },
                  name: { type: 'string', maxLength: 255 },
                  thumbnail: { type: 'string', format: 'uri' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const validation = createUpdateSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: validation.error.errors[0].message,
        });
      }

      const project = await projectService.findById(validation.data.projectId);
      if (!project) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Project not found',
        });
      }

      // Check access based on project type
      if (project.teamId) {
        // Team-based project: check team membership
        const isMember = await teamService.isMember(project.teamId.toString(), request.user!.userId);
        if (!isMember) {
          return reply.code(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'You are not a member of this team',
          });
        }

        // Check role (must be member or higher)
        const role = await teamService.getMemberRole(project.teamId.toString(), request.user!.userId);
        if (role === 'viewer') {
          return reply.code(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'Viewers cannot post updates',
          });
        }
      } else {
        // Personal project: check owner or collaborator with edit access
        const projectRole = await projectService.getUserRole(validation.data.projectId, request.user!.userId);
        if (!projectRole) {
          return reply.code(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'You do not have access to this project',
          });
        }
        if (projectRole === 'viewer') {
          return reply.code(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'Viewers cannot post updates',
          });
        }
      }

      const update = await feedService.create(
        validation.data,
        project.teamId?.toString() || null,
        request.user!.userId
      );

      // Increment project update count
      await projectService.incrementUpdateCount(project._id.toString());

      return reply.code(201).send({ update });
    }
  );

  // Get combined feed
  fastify.get<{ Querystring: FeedQueryInput }>(
    '/feed',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Updates'],
        description: 'Get combined feed from all projects',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            cursor: { type: 'string' },
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            category: { type: 'string', enum: ['progress', 'blocker', 'bug', 'feature', 'milestone', 'general'] },
          },
        },
      },
    },
    async (request, reply) => {
      const validation = feedQuerySchema.safeParse(request.query);
      if (!validation.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: validation.error.errors[0].message,
        });
      }

      // Get all projects the user has access to (owner or collaborator)
      const projects = await projectService.findByUserId(request.user!.userId);
      const projectIds = projects.map((p) => p._id.toString());

      if (projectIds.length === 0) {
        return reply.send({
          updates: [],
          hasMore: false,
        });
      }

      const result = await feedService.getFeed(projectIds, validation.data);

      // Enrich updates with author info
      const authorIds = [...new Set(result.updates.map((u) => u.authorId.toString()))];
      const authors = await userService.findByIds(authorIds);
      const authorsMap = new Map(authors.map((a) => [a._id.toString(), userService.toPublic(a)]));

      const enrichedUpdates = result.updates.map((update) => ({
        ...update,
        author: authorsMap.get(update.authorId.toString()) || null,
      }));

      return reply.send({
        updates: enrichedUpdates,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      });
    }
  );

  // Get team feed
  fastify.get<{ Params: { teamId: string }; Querystring: FeedQueryInput }>(
    '/feed/team/:teamId',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Updates'],
        description: 'Get feed for a specific team',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['teamId'],
          properties: {
            teamId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            cursor: { type: 'string' },
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            category: { type: 'string', enum: ['progress', 'blocker', 'bug', 'feature', 'milestone', 'general'] },
          },
        },
      },
    },
    async (request, reply) => {
      const { teamId } = request.params;

      // Check team membership
      const isMember = await teamService.isMember(teamId, request.user!.userId);
      if (!isMember) {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'You are not a member of this team',
        });
      }

      const validation = feedQuerySchema.safeParse(request.query);
      if (!validation.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: validation.error.errors[0].message,
        });
      }

      const result = await feedService.getTeamFeed(teamId, validation.data);

      // Enrich updates with author info
      const authorIds = [...new Set(result.updates.map((u) => u.authorId.toString()))];
      const authors = await userService.findByIds(authorIds);
      const authorsMap = new Map(authors.map((a) => [a._id.toString(), userService.toPublic(a)]));

      const enrichedUpdates = result.updates.map((update) => ({
        ...update,
        author: authorsMap.get(update.authorId.toString()) || null,
      }));

      return reply.send({
        updates: enrichedUpdates,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      });
    }
  );

  // Get project feed
  fastify.get<{ Params: { projectId: string }; Querystring: FeedQueryInput }>(
    '/feed/project/:projectId',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Updates'],
        description: 'Get feed for a specific project',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['projectId'],
          properties: {
            projectId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            cursor: { type: 'string' },
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            category: { type: 'string', enum: ['progress', 'blocker', 'bug', 'feature', 'milestone', 'general'] },
          },
        },
      },
    },
    async (request, reply) => {
      const { projectId } = request.params;

      const project = await projectService.findById(projectId);
      if (!project) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Project not found',
        });
      }

      // Check access: either team membership or project collaborator
      if (project.teamId) {
        // Team-based project: check team membership
        const isMember = await teamService.isMember(project.teamId.toString(), request.user!.userId);
        if (!isMember) {
          return reply.code(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'You are not a member of this team',
          });
        }
      } else {
        // Personal project: check owner or collaborator
        const role = await projectService.getUserRole(projectId, request.user!.userId);
        if (!role) {
          return reply.code(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'You do not have access to this project',
          });
        }
      }

      const validation = feedQuerySchema.safeParse(request.query);
      if (!validation.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: validation.error.errors[0].message,
        });
      }

      const result = await feedService.getProjectFeed(projectId, validation.data);

      // Enrich updates with author info
      const authorIds = [...new Set(result.updates.map((u) => u.authorId.toString()))];
      const authors = await userService.findByIds(authorIds);
      const authorsMap = new Map(authors.map((a) => [a._id.toString(), userService.toPublic(a)]));

      const enrichedUpdates = result.updates.map((update) => ({
        ...update,
        author: authorsMap.get(update.authorId.toString()) || null,
      }));

      return reply.send({
        updates: enrichedUpdates,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      });
    }
  );

  // Get single update
  fastify.get<{ Params: { updateId: string } }>(
    '/updates/:updateId',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Updates'],
        description: 'Get a single update',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['updateId'],
          properties: {
            updateId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const update = await feedService.findById(request.params.updateId);

      if (!update) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Update not found',
        });
      }

      // Check access based on project
      const project = await projectService.findById(update.projectId.toString());
      if (!project) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Project not found',
        });
      }

      if (project.teamId) {
        // Team-based project: check team membership
        const isMember = await teamService.isMember(project.teamId.toString(), request.user!.userId);
        if (!isMember) {
          return reply.code(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'You are not a member of this team',
          });
        }
      } else {
        // Personal project: check project access
        const role = await projectService.getUserRole(update.projectId.toString(), request.user!.userId);
        if (!role) {
          return reply.code(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'You do not have access to this project',
          });
        }
      }

      const author = await userService.findById(update.authorId.toString());

      return reply.send({
        update: {
          ...update,
          author: author ? userService.toPublic(author) : null,
        },
      });
    }
  );

  // Update an update
  fastify.patch<{ Params: { updateId: string }; Body: UpdateUpdateInput }>(
    '/updates/:updateId',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Updates'],
        description: 'Edit an update',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['updateId'],
          properties: {
            updateId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            content: { type: 'string', minLength: 1, maxLength: 5000 },
            category: { type: 'string', enum: ['progress', 'blocker', 'bug', 'feature', 'milestone', 'general'] },
            mood: { type: 'string', enum: ['positive', 'neutral', 'negative', 'urgent'] },
            attachments: {
              type: 'array',
              maxItems: 10,
              items: {
                type: 'object',
                required: ['type', 'url', 'name'],
                properties: {
                  type: { type: 'string', enum: ['image', 'file', 'link'] },
                  url: { type: 'string', format: 'uri' },
                  name: { type: 'string', maxLength: 255 },
                  thumbnail: { type: 'string', format: 'uri' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const validation = updateUpdateSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: validation.error.errors[0].message,
        });
      }

      const update = await feedService.findById(request.params.updateId);

      if (!update) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Update not found',
        });
      }

      // Only the author can edit
      if (update.authorId.toString() !== request.user!.userId) {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'You can only edit your own updates',
        });
      }

      const updatedUpdate = await feedService.update(request.params.updateId, validation.data);

      const author = await userService.findById(updatedUpdate!.authorId.toString());

      return reply.send({
        update: {
          ...updatedUpdate,
          author: author ? userService.toPublic(author) : null,
        },
      });
    }
  );

  // Delete update
  fastify.delete<{ Params: { updateId: string } }>(
    '/updates/:updateId',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Updates'],
        description: 'Delete an update',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['updateId'],
          properties: {
            updateId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const update = await feedService.findById(request.params.updateId);

      if (!update) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Update not found',
        });
      }

      // Check access based on project
      const project = await projectService.findById(update.projectId.toString());
      if (!project) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Project not found',
        });
      }

      // Only the author or admin can delete
      const isAuthor = update.authorId.toString() === request.user!.userId;
      let isAdmin = false;

      if (project.teamId) {
        // Team-based project: check team admin
        const role = await teamService.getMemberRole(project.teamId.toString(), request.user!.userId);
        isAdmin = role === 'admin';
      } else {
        // Personal project: owner is admin
        isAdmin = project.ownerId.toString() === request.user!.userId;
      }

      if (!isAuthor && !isAdmin) {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'You can only delete your own updates or be an admin',
        });
      }

      await feedService.delete(request.params.updateId);
      await projectService.decrementUpdateCount(update.projectId.toString());

      return reply.send({ message: 'Update deleted successfully' });
    }
  );

  // Add reaction
  fastify.post<{ Params: { updateId: string }; Body: AddReactionInput }>(
    '/updates/:updateId/reactions',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Updates'],
        description: 'Add a reaction to an update',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['updateId'],
          properties: {
            updateId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['emoji'],
          properties: {
            emoji: { type: 'string', minLength: 1, maxLength: 10 },
          },
        },
      },
    },
    async (request, reply) => {
      const validation = addReactionSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: validation.error.errors[0].message,
        });
      }

      const update = await feedService.findById(request.params.updateId);

      if (!update) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Update not found',
        });
      }

      // Check access based on project
      const project = await projectService.findById(update.projectId.toString());
      if (!project) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Project not found',
        });
      }

      if (project.teamId) {
        // Team-based project: check team membership
        const isMember = await teamService.isMember(project.teamId.toString(), request.user!.userId);
        if (!isMember) {
          return reply.code(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'You are not a member of this team',
          });
        }
      } else {
        // Personal project: check project access
        const role = await projectService.getUserRole(update.projectId.toString(), request.user!.userId);
        if (!role) {
          return reply.code(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'You do not have access to this project',
          });
        }
      }

      const updatedUpdate = await feedService.addReaction(
        request.params.updateId,
        request.user!.userId,
        validation.data.emoji
      );

      return reply.send({ update: updatedUpdate });
    }
  );

  // Remove reaction
  fastify.delete<{ Params: { updateId: string; emoji: string } }>(
    '/updates/:updateId/reactions/:emoji',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Updates'],
        description: 'Remove a reaction from an update',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['updateId', 'emoji'],
          properties: {
            updateId: { type: 'string' },
            emoji: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const update = await feedService.findById(request.params.updateId);

      if (!update) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Update not found',
        });
      }

      // Check access based on project
      const project = await projectService.findById(update.projectId.toString());
      if (!project) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Project not found',
        });
      }

      if (project.teamId) {
        // Team-based project: check team membership
        const isMember = await teamService.isMember(project.teamId.toString(), request.user!.userId);
        if (!isMember) {
          return reply.code(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'You are not a member of this team',
          });
        }
      } else {
        // Personal project: check project access
        const role = await projectService.getUserRole(update.projectId.toString(), request.user!.userId);
        if (!role) {
          return reply.code(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'You do not have access to this project',
          });
        }
      }

      const updatedUpdate = await feedService.removeReaction(
        request.params.updateId,
        request.user!.userId,
        decodeURIComponent(request.params.emoji)
      );

      return reply.send({ update: updatedUpdate });
    }
  );

  // Add comment
  fastify.post<{ Params: { updateId: string }; Body: AddCommentInput }>(
    '/updates/:updateId/comments',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Updates'],
        description: 'Add a comment to an update',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['updateId'],
          properties: {
            updateId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string', minLength: 1, maxLength: 2000 },
          },
        },
      },
    },
    async (request, reply) => {
      const validation = addCommentSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: validation.error.errors[0].message,
        });
      }

      const update = await feedService.findById(request.params.updateId);

      if (!update) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Update not found',
        });
      }

      // Check access based on project
      const project = await projectService.findById(update.projectId.toString());
      if (!project) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Project not found',
        });
      }

      if (project.teamId) {
        // Team-based project: check team membership
        const isMember = await teamService.isMember(project.teamId.toString(), request.user!.userId);
        if (!isMember) {
          return reply.code(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'You are not a member of this team',
          });
        }
      } else {
        // Personal project: check project access
        const role = await projectService.getUserRole(update.projectId.toString(), request.user!.userId);
        if (!role) {
          return reply.code(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'You do not have access to this project',
          });
        }
      }

      const updatedUpdate = await feedService.addComment(
        request.params.updateId,
        request.user!.userId,
        validation.data.content
      );

      // Enrich with author info
      const author = await userService.findById(updatedUpdate!.authorId.toString());

      return reply.code(201).send({
        update: {
          ...updatedUpdate,
          author: author ? userService.toPublic(author) : null,
        },
      });
    }
  );

  // Update comment
  fastify.patch<{ Params: { updateId: string; commentId: string }; Body: UpdateCommentInput }>(
    '/updates/:updateId/comments/:commentId',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Updates'],
        description: 'Edit a comment',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['updateId', 'commentId'],
          properties: {
            updateId: { type: 'string' },
            commentId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string', minLength: 1, maxLength: 2000 },
          },
        },
      },
    },
    async (request, reply) => {
      const validation = updateCommentSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: validation.error.errors[0].message,
        });
      }

      const update = await feedService.findById(request.params.updateId);

      if (!update) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Update not found',
        });
      }

      // Only the comment author can edit
      const updatedUpdate = await feedService.updateComment(
        request.params.updateId,
        request.params.commentId,
        request.user!.userId,
        validation.data.content
      );

      if (!updatedUpdate) {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'You can only edit your own comments',
        });
      }

      const author = await userService.findById(updatedUpdate.authorId.toString());

      return reply.send({
        update: {
          ...updatedUpdate,
          author: author ? userService.toPublic(author) : null,
        },
      });
    }
  );

  // Delete comment
  fastify.delete<{ Params: { updateId: string; commentId: string } }>(
    '/updates/:updateId/comments/:commentId',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Updates'],
        description: 'Delete a comment',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['updateId', 'commentId'],
          properties: {
            updateId: { type: 'string' },
            commentId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const update = await feedService.findById(request.params.updateId);

      if (!update) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Update not found',
        });
      }

      // Check if user is admin (can delete any comment) or comment author
      let isAdmin = false;
      if (update.teamId) {
        const role = await teamService.getMemberRole(update.teamId.toString(), request.user!.userId);
        isAdmin = role === 'admin';
      } else {
        const project = await projectService.findById(update.projectId.toString());
        if (project) {
          isAdmin = project.ownerId.toString() === request.user!.userId;
        }
      }

      const updatedUpdate = await feedService.deleteComment(
        request.params.updateId,
        request.params.commentId,
        request.user!.userId,
        isAdmin
      );

      if (!updatedUpdate) {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'You can only delete your own comments or be an admin',
        });
      }

      return reply.send({ message: 'Comment deleted successfully' });
    }
  );
};

export default updatesRoutes;
