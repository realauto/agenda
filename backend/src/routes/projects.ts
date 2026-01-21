import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ProjectService } from '../services/project.service.js';
import { FeedService } from '../services/feed.service.js';
import {
  createProjectSchema,
  updateProjectSchema,
  type CreateProjectInput,
  type UpdateProjectInput,
} from '../models/Project.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeTeamRole } from '../middleware/authorize.js';

const projectsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const projectService = new ProjectService(fastify.mongo.collections.projects);
  const feedService = new FeedService(fastify.mongo.collections.updates, fastify.mongo.collections.users);

  // Get all projects for a team
  fastify.get<{ Params: { teamId: string } }>(
    '/teams/:teamId/projects',
    {
      onRequest: [authenticate, authorizeTeamRole('viewer')],
      schema: {
        tags: ['Projects'],
        description: 'Get all projects for a team',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['teamId'],
          properties: {
            teamId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const projects = await projectService.findByTeamId(request.params.teamId);
      return reply.send({ projects });
    }
  );

  // Create project
  fastify.post<{ Params: { teamId: string }; Body: CreateProjectInput }>(
    '/teams/:teamId/projects',
    {
      onRequest: [authenticate, authorizeTeamRole('member')],
      schema: {
        tags: ['Projects'],
        description: 'Create a new project',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['teamId'],
          properties: {
            teamId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100 },
            description: { type: 'string', maxLength: 1000 },
            visibility: { type: 'string', enum: ['public', 'team', 'private'] },
            color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
            tags: { type: 'array', items: { type: 'string', maxLength: 30 }, maxItems: 10 },
          },
        },
      },
    },
    async (request, reply) => {
      const validation = createProjectSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: validation.error.errors[0].message,
        });
      }

      const project = await projectService.create(
        validation.data,
        request.params.teamId,
        request.user!.userId
      );

      return reply.code(201).send({ project });
    }
  );

  // Get project by ID
  fastify.get<{ Params: { projectId: string } }>(
    '/projects/:projectId',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Projects'],
        description: 'Get project by ID',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['projectId'],
          properties: {
            projectId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const project = await projectService.findById(request.params.projectId);

      if (!project) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Project not found',
        });
      }

      // Check team membership
      const isMember = await fastify.mongo.collections.teams.findOne({
        _id: project.teamId,
        'members.userId': new (await import('mongodb')).ObjectId(request.user!.userId),
      });

      if (!isMember) {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'You are not a member of this team',
        });
      }

      return reply.send({ project });
    }
  );

  // Update project
  fastify.patch<{ Params: { projectId: string }; Body: UpdateProjectInput }>(
    '/projects/:projectId',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Projects'],
        description: 'Update project',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['projectId'],
          properties: {
            projectId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100 },
            description: { type: 'string', maxLength: 1000 },
            status: { type: 'string', enum: ['active', 'paused', 'completed', 'archived'] },
            visibility: { type: 'string', enum: ['public', 'team', 'private'] },
            color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
            tags: { type: 'array', items: { type: 'string', maxLength: 30 }, maxItems: 10 },
          },
        },
      },
    },
    async (request, reply) => {
      const validation = updateProjectSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: validation.error.errors[0].message,
        });
      }

      const project = await projectService.findById(request.params.projectId);

      if (!project) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Project not found',
        });
      }

      // Check team membership (must be member or higher)
      const { ObjectId } = await import('mongodb');
      const team = await fastify.mongo.collections.teams.findOne({
        _id: project.teamId,
        'members.userId': new ObjectId(request.user!.userId),
      });

      if (!team) {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'You are not a member of this team',
        });
      }

      const member = team.members.find((m) => m.userId.toString() === request.user!.userId);
      if (!member || member.role === 'viewer') {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Requires member role or higher',
        });
      }

      const updatedProject = await projectService.update(request.params.projectId, validation.data);

      return reply.send({ project: updatedProject });
    }
  );

  // Delete project
  fastify.delete<{ Params: { projectId: string } }>(
    '/projects/:projectId',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Projects'],
        description: 'Delete project',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['projectId'],
          properties: {
            projectId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const project = await projectService.findById(request.params.projectId);

      if (!project) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Project not found',
        });
      }

      // Check team membership (must be admin)
      const { ObjectId } = await import('mongodb');
      const team = await fastify.mongo.collections.teams.findOne({
        _id: project.teamId,
        'members.userId': new ObjectId(request.user!.userId),
      });

      if (!team) {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'You are not a member of this team',
        });
      }

      const member = team.members.find((m) => m.userId.toString() === request.user!.userId);
      if (!member || member.role !== 'admin') {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Requires admin role',
        });
      }

      // Delete all updates for this project
      await feedService.deleteByProjectId(request.params.projectId);

      // Delete the project
      await projectService.delete(request.params.projectId);

      return reply.send({ message: 'Project deleted successfully' });
    }
  );
};

export default projectsRoutes;
