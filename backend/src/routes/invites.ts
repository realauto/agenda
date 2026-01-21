import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { InviteService } from '../services/invite.service.js';
import { TeamService } from '../services/team.service.js';
import { UserService } from '../services/user.service.js';
import { createInviteSchema, type CreateInviteInput } from '../models/Invite.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeTeamRole } from '../middleware/authorize.js';

const invitesRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const inviteService = new InviteService(fastify.mongo.collections.invites);
  const teamService = new TeamService(fastify.mongo.collections.teams);
  const userService = new UserService(fastify.mongo.collections.users);

  // Create invite
  fastify.post<{ Params: { teamId: string }; Body: CreateInviteInput }>(
    '/teams/:teamId/invites',
    {
      onRequest: [authenticate, authorizeTeamRole('admin')],
      schema: {
        tags: ['Invites'],
        description: 'Create a team invite',
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
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['admin', 'member', 'viewer'] },
          },
        },
      },
    },
    async (request, reply) => {
      const validation = createInviteSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: validation.error.errors[0].message,
        });
      }

      const { teamId } = request.params;
      const { email } = validation.data;

      // Check if user is already a member
      const existingUser = await userService.findByEmail(email);
      if (existingUser) {
        const isMember = await teamService.isMember(teamId, existingUser._id.toString());
        if (isMember) {
          return reply.code(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'User is already a member of this team',
          });
        }
      }

      // Check if there's already a pending invite
      const existingInvite = await inviteService.findPendingByEmailAndTeam(email, teamId);
      if (existingInvite) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'An invite has already been sent to this email',
        });
      }

      const invite = await inviteService.create(validation.data, teamId, request.user!.userId);

      return reply.code(201).send({ invite });
    }
  );

  // Get team invites
  fastify.get<{ Params: { teamId: string } }>(
    '/teams/:teamId/invites',
    {
      onRequest: [authenticate, authorizeTeamRole('admin')],
      schema: {
        tags: ['Invites'],
        description: 'Get all invites for a team',
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
      const invites = await inviteService.findByTeamId(request.params.teamId);
      return reply.send({ invites });
    }
  );

  // Revoke invite
  fastify.delete<{ Params: { teamId: string; inviteId: string } }>(
    '/teams/:teamId/invites/:inviteId',
    {
      onRequest: [authenticate, authorizeTeamRole('admin')],
      schema: {
        tags: ['Invites'],
        description: 'Revoke an invite',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['teamId', 'inviteId'],
          properties: {
            teamId: { type: 'string' },
            inviteId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const invite = await inviteService.findById(request.params.inviteId);

      if (!invite || invite.teamId.toString() !== request.params.teamId) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Invite not found',
        });
      }

      if (invite.status !== 'pending') {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Only pending invites can be revoked',
        });
      }

      await inviteService.revoke(request.params.inviteId);

      return reply.send({ message: 'Invite revoked successfully' });
    }
  );

  // Resend invite
  fastify.post<{ Params: { teamId: string; inviteId: string } }>(
    '/teams/:teamId/invites/:inviteId/resend',
    {
      onRequest: [authenticate, authorizeTeamRole('admin')],
      schema: {
        tags: ['Invites'],
        description: 'Resend an invite (generates new token)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['teamId', 'inviteId'],
          properties: {
            teamId: { type: 'string' },
            inviteId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const invite = await inviteService.findById(request.params.inviteId);

      if (!invite || invite.teamId.toString() !== request.params.teamId) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Invite not found',
        });
      }

      if (invite.status !== 'pending') {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Only pending invites can be resent',
        });
      }

      const updatedInvite = await inviteService.resend(request.params.inviteId);

      return reply.send({ invite: updatedInvite });
    }
  );

  // Get invite by token (public)
  fastify.get<{ Params: { token: string } }>(
    '/invites/:token',
    {
      schema: {
        tags: ['Invites'],
        description: 'Get invite details by token',
        params: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const invite = await inviteService.findByToken(request.params.token);

      if (!invite) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Invite not found',
        });
      }

      if (invite.status !== 'pending') {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: `This invite has been ${invite.status}`,
        });
      }

      if (invite.expiresAt < new Date()) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'This invite has expired',
        });
      }

      const team = await teamService.findById(invite.teamId.toString());

      return reply.send({
        invite: {
          _id: invite._id,
          email: invite.email,
          role: invite.role,
          expiresAt: invite.expiresAt,
          team: team
            ? {
                _id: team._id,
                name: team.name,
                avatar: team.avatar,
              }
            : null,
        },
      });
    }
  );

  // Accept invite
  fastify.post<{ Params: { token: string } }>(
    '/invites/:token/accept',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Invites'],
        description: 'Accept an invite',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const invite = await inviteService.findByToken(request.params.token);

      if (!invite) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Invite not found',
        });
      }

      if (invite.status !== 'pending') {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: `This invite has been ${invite.status}`,
        });
      }

      if (invite.expiresAt < new Date()) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'This invite has expired',
        });
      }

      // Check if user email matches invite email
      const user = await userService.findById(request.user!.userId);
      if (!user || user.email.toLowerCase() !== invite.email.toLowerCase()) {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'This invite was sent to a different email address',
        });
      }

      // Check if already a member
      const isMember = await teamService.isMember(invite.teamId.toString(), request.user!.userId);
      if (isMember) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'You are already a member of this team',
        });
      }

      // Accept the invite
      await inviteService.accept(request.params.token, request.user!.userId);

      // Add user to team
      await teamService.addMember(invite.teamId.toString(), request.user!.userId, invite.role);

      const team = await teamService.findById(invite.teamId.toString());

      return reply.send({
        message: 'Invite accepted successfully',
        team,
      });
    }
  );

  // Get pending invites for current user
  fastify.get(
    '/invites/pending',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Invites'],
        description: 'Get pending invites for current user',
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

      const invites = await inviteService.findPendingByEmail(user.email);

      // Enrich with team info
      const enrichedInvites = await Promise.all(
        invites.map(async (invite) => {
          const team = await teamService.findById(invite.teamId.toString());
          return {
            ...invite,
            team: team
              ? {
                  _id: team._id,
                  name: team.name,
                  avatar: team.avatar,
                }
              : null,
          };
        })
      );

      return reply.send({ invites: enrichedInvites });
    }
  );
};

export default invitesRoutes;
