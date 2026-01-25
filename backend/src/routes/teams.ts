import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { TeamService } from '../services/team.service.js';
import { UserService } from '../services/user.service.js';
import { FeedService } from '../services/feed.service.js';
import { ProjectService } from '../services/project.service.js';
import {
  createTeamSchema,
  updateTeamSchema,
  updateMemberRoleSchema,
  type CreateTeamInput,
  type UpdateTeamInput,
  type UpdateMemberRoleInput,
} from '../models/Team.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeTeamRole, authorizeTeamOwner } from '../middleware/authorize.js';

const teamsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const teamService = new TeamService(fastify.mongo.collections.teams);
  const userService = new UserService(fastify.mongo.collections.users);
  const feedService = new FeedService(fastify.mongo.collections.updates, fastify.mongo.collections.users);
  const projectService = new ProjectService(fastify.mongo.collections.projects);
  projectService.setUsersCollection(fastify.mongo.collections.users);

  // Get all teams for current user
  fastify.get(
    '/',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Teams'],
        description: 'Get all teams for current user',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const teams = await teamService.findByUserId(request.user!.userId);
      return reply.send({ teams });
    }
  );

  // Create team
  fastify.post<{ Body: CreateTeamInput }>(
    '/',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Teams'],
        description: 'Create a new team',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 50 },
            description: { type: 'string', maxLength: 500 },
            avatar: { type: 'string', format: 'uri' },
            settings: {
              type: 'object',
              properties: {
                isPublic: { type: 'boolean' },
                allowMemberInvites: { type: 'boolean' },
                defaultProjectVisibility: { type: 'string', enum: ['public', 'team', 'private'] },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const validation = createTeamSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: validation.error.errors[0].message,
        });
      }

      const team = await teamService.create(validation.data, request.user!.userId);
      return reply.code(201).send({ team });
    }
  );

  // Get team by ID
  fastify.get<{ Params: { teamId: string } }>(
    '/:teamId',
    {
      onRequest: [authenticate, authorizeTeamRole('viewer')],
      schema: {
        tags: ['Teams'],
        description: 'Get team by ID',
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
      const team = await teamService.findById(request.params.teamId);

      if (!team) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Team not found',
        });
      }

      return reply.send({ team });
    }
  );

  // Update team
  fastify.patch<{ Params: { teamId: string }; Body: UpdateTeamInput }>(
    '/:teamId',
    {
      onRequest: [authenticate, authorizeTeamRole('admin')],
      schema: {
        tags: ['Teams'],
        description: 'Update team',
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
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 50 },
            description: { type: 'string', maxLength: 500 },
            avatar: { type: 'string', format: 'uri' },
            settings: {
              type: 'object',
              properties: {
                isPublic: { type: 'boolean' },
                allowMemberInvites: { type: 'boolean' },
                defaultProjectVisibility: { type: 'string', enum: ['public', 'team', 'private'] },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const validation = updateTeamSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: validation.error.errors[0].message,
        });
      }

      const team = await teamService.update(request.params.teamId, validation.data);

      if (!team) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Team not found',
        });
      }

      return reply.send({ team });
    }
  );

  // Delete team
  fastify.delete<{ Params: { teamId: string } }>(
    '/:teamId',
    {
      onRequest: [authenticate, authorizeTeamOwner()],
      schema: {
        tags: ['Teams'],
        description: 'Delete team (owner only)',
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
      const { teamId } = request.params;

      // Delete all updates for this team
      await feedService.deleteByTeamId(teamId);

      // Delete all projects for this team
      const projects = await projectService.findByTeamId(teamId);
      for (const project of projects) {
        await projectService.delete(project._id.toString());
      }

      // Delete the team
      const deleted = await teamService.delete(teamId);

      if (!deleted) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Team not found',
        });
      }

      return reply.send({ message: 'Team deleted successfully' });
    }
  );

  // Get team members
  fastify.get<{ Params: { teamId: string } }>(
    '/:teamId/members',
    {
      onRequest: [authenticate, authorizeTeamRole('viewer')],
      schema: {
        tags: ['Teams'],
        description: 'Get team members',
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
      const team = await teamService.findById(request.params.teamId);

      if (!team) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Team not found',
        });
      }

      const userIds = team.members.map((m) => m.userId.toString());
      const users = await userService.findByIds(userIds);

      const members = team.members.map((member) => {
        const user = users.find((u) => u._id.toString() === member.userId.toString());
        return {
          ...member,
          user: user ? userService.toPublic(user) : null,
        };
      });

      return reply.send({ members });
    }
  );

  // Update member role
  fastify.patch<{ Params: { teamId: string; memberId: string }; Body: UpdateMemberRoleInput }>(
    '/:teamId/members/:memberId',
    {
      onRequest: [authenticate, authorizeTeamRole('admin')],
      schema: {
        tags: ['Teams'],
        description: 'Update member role',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['teamId', 'memberId'],
          properties: {
            teamId: { type: 'string' },
            memberId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['role'],
          properties: {
            role: { type: 'string', enum: ['admin', 'member', 'viewer'] },
          },
        },
      },
    },
    async (request, reply) => {
      const validation = updateMemberRoleSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: validation.error.errors[0].message,
        });
      }

      const { teamId, memberId } = request.params;
      const team = await teamService.findById(teamId);

      if (!team) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Team not found',
        });
      }

      // Cannot change owner's role
      if (team.ownerId.toString() === memberId) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Cannot change team owner role',
        });
      }

      const updatedTeam = await teamService.updateMemberRole(teamId, memberId, validation.data.role);

      if (!updatedTeam) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Member not found',
        });
      }

      return reply.send({ team: updatedTeam });
    }
  );

  // Remove member
  fastify.delete<{ Params: { teamId: string; memberId: string } }>(
    '/:teamId/members/:memberId',
    {
      onRequest: [authenticate, authorizeTeamRole('admin')],
      schema: {
        tags: ['Teams'],
        description: 'Remove member from team',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['teamId', 'memberId'],
          properties: {
            teamId: { type: 'string' },
            memberId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { teamId, memberId } = request.params;
      const team = await teamService.findById(teamId);

      if (!team) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Team not found',
        });
      }

      // Cannot remove owner
      if (team.ownerId.toString() === memberId) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Cannot remove team owner',
        });
      }

      const updatedTeam = await teamService.removeMember(teamId, memberId);

      if (!updatedTeam) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Member not found',
        });
      }

      return reply.send({ team: updatedTeam });
    }
  );

  // Leave team
  fastify.post<{ Params: { teamId: string } }>(
    '/:teamId/leave',
    {
      onRequest: [authenticate, authorizeTeamRole('viewer')],
      schema: {
        tags: ['Teams'],
        description: 'Leave team',
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
      const { teamId } = request.params;
      const userId = request.user!.userId;

      const team = await teamService.findById(teamId);

      if (!team) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Team not found',
        });
      }

      // Owner cannot leave
      if (team.ownerId.toString() === userId) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Team owner cannot leave. Transfer ownership or delete the team.',
        });
      }

      await teamService.removeMember(teamId, userId);

      return reply.send({ message: 'Successfully left the team' });
    }
  );
};

export default teamsRoutes;
