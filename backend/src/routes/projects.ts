import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { ObjectId } from 'mongodb';
import { ProjectService } from '../services/project.service.js';
import { FeedService } from '../services/feed.service.js';
import { UserService } from '../services/user.service.js';
import {
  createProjectSchema,
  updateProjectSchema,
  inviteCollaboratorSchema,
  type CreateProjectInput,
  type UpdateProjectInput,
  type InviteCollaboratorInput,
} from '../models/Project.js';
import { authenticate } from '../middleware/authenticate.js';
import type { ProjectRole } from '../types/index.js';

const projectsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const projectService = new ProjectService(
    fastify.mongo.collections.projects,
    fastify.mongo.collections.projectInvites
  );
  const feedService = new FeedService(
    fastify.mongo.collections.updates,
    fastify.mongo.collections.users
  );
  const userService = new UserService(fastify.mongo.collections.users);

  // Get all projects for current user (owned + shared)
  fastify.get(
    '/projects',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Projects'],
        description: 'Get all projects for the current user',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            filter: { type: 'string', enum: ['all', 'owned', 'shared'] },
          },
        },
      },
    },
    async (request, reply) => {
      const { filter = 'all' } = request.query as { filter?: string };
      const userId = request.user!.userId;

      let projects;
      switch (filter) {
        case 'owned':
          projects = await projectService.findOwnedByUser(userId);
          break;
        case 'shared':
          projects = await projectService.findSharedWithUser(userId);
          break;
        default:
          projects = await projectService.findByUserId(userId);
      }

      return reply.send({ projects });
    }
  );

  // Create project
  fastify.post<{ Body: CreateProjectInput }>(
    '/projects',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Projects'],
        description: 'Create a new project',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100 },
            description: { type: 'string', maxLength: 1000 },
            visibility: { type: 'string', enum: ['public', 'private', 'collaborators'] },
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

      const project = await projectService.create(validation.data, request.user!.userId);

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

      // Check access
      const role = await projectService.getUserRole(
        request.params.projectId,
        request.user!.userId
      );

      if (!role && project.visibility !== 'public') {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'You do not have access to this project',
        });
      }

      return reply.send({ project, role: role ?? 'viewer' });
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
            visibility: { type: 'string', enum: ['public', 'private', 'collaborators'] },
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

      // Check if user has edit access
      const role = await projectService.getUserRole(
        request.params.projectId,
        request.user!.userId
      );

      if (!role || role === 'viewer') {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'You do not have permission to edit this project',
        });
      }

      const updatedProject = await projectService.update(
        request.params.projectId,
        validation.data
      );

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
      // Only owner can delete
      const role = await projectService.getUserRole(
        request.params.projectId,
        request.user!.userId
      );

      if (role !== 'owner') {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Only the project owner can delete this project',
        });
      }

      // Delete all updates for this project
      await feedService.deleteByProjectId(request.params.projectId);

      // Delete the project
      await projectService.delete(request.params.projectId);

      return reply.send({ message: 'Project deleted successfully' });
    }
  );

  // ============ Collaborator Management ============

  // Get collaborators for a project
  fastify.get<{ Params: { projectId: string } }>(
    '/projects/:projectId/collaborators',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Projects', 'Collaborators'],
        description: 'Get all collaborators for a project',
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

      // Check access
      const role = await projectService.getUserRole(
        request.params.projectId,
        request.user!.userId
      );

      if (!role) {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'You do not have access to this project',
        });
      }

      // Get owner info
      const owner = await userService.findById(project.ownerId.toString());

      // Get collaborator details
      const collaborators = await Promise.all(
        project.collaborators.map(async (collab) => {
          const user = await userService.findById(collab.userId.toString());
          return {
            userId: collab.userId,
            role: collab.role,
            addedAt: collab.addedAt,
            user: user ? userService.toPublic(user) : null,
          };
        })
      );

      // Get pending invites (only for owner/editors)
      let pendingInvites: any[] = [];
      if (role === 'owner' || role === 'editor') {
        pendingInvites = await projectService.findInvitesByProjectId(
          request.params.projectId
        );
      }

      return reply.send({
        owner: owner ? userService.toPublic(owner) : null,
        collaborators,
        pendingInvites,
      });
    }
  );

  // Invite collaborator by email
  fastify.post<{ Params: { projectId: string }; Body: InviteCollaboratorInput }>(
    '/projects/:projectId/invite',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Projects', 'Collaborators'],
        description: 'Invite a collaborator to the project',
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
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['editor', 'viewer'] },
          },
        },
      },
    },
    async (request, reply) => {
      const validation = inviteCollaboratorSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Validation Error',
          message: validation.error.errors[0].message,
        });
      }

      // Check if user has permission to invite
      const role = await projectService.getUserRole(
        request.params.projectId,
        request.user!.userId
      );

      if (!role || role === 'viewer') {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'You do not have permission to invite collaborators',
        });
      }

      const { email, role: inviteRole } = validation.data;

      // Check if email is already the owner
      const project = await projectService.findById(request.params.projectId);
      const owner = await userService.findById(project!.ownerId.toString());
      if (owner?.email.toLowerCase() === email.toLowerCase()) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'This user is the project owner',
        });
      }

      // Check if user is already a collaborator
      const existingUser = await userService.findByEmail(email);
      if (existingUser) {
        const isCollaborator = project!.collaborators.some(
          (c) => c.userId.toString() === existingUser._id.toString()
        );
        if (isCollaborator) {
          return reply.code(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'This user is already a collaborator',
          });
        }
      }

      // Check if there's already a pending invite
      const existingInvites = await projectService.findInvitesByProjectId(
        request.params.projectId
      );
      const pendingInvite = existingInvites.find(
        (inv) => inv.email.toLowerCase() === email.toLowerCase()
      );
      if (pendingInvite) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'An invite is already pending for this email',
        });
      }

      // Create invite
      const invite = await projectService.createInvite(
        request.params.projectId,
        request.user!.userId,
        email,
        inviteRole as ProjectRole
      );

      // TODO: Send email notification with invite link

      return reply.code(201).send({
        invite,
        message: 'Invite sent successfully',
      });
    }
  );

  // Accept invite
  fastify.post<{ Params: { token: string } }>(
    '/project-invites/:token/accept',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Projects', 'Invites'],
        description: 'Accept a project invite',
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
      const invite = await projectService.findInviteByToken(request.params.token);

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
          message: `Invite has already been ${invite.status}`,
        });
      }

      if (invite.expiresAt < new Date()) {
        await projectService.updateInviteStatus(request.params.token, 'expired');
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invite has expired',
        });
      }

      // Check if the accepting user's email matches the invite
      const user = await userService.findById(request.user!.userId);
      if (user?.email.toLowerCase() !== invite.email.toLowerCase()) {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'This invite was sent to a different email address',
        });
      }

      // Add user as collaborator
      await projectService.addCollaborator(
        invite.projectId.toString(),
        request.user!.userId,
        invite.role
      );

      // Update invite status
      await projectService.updateInviteStatus(
        request.params.token,
        'accepted',
        request.user!.userId
      );

      const project = await projectService.findById(invite.projectId.toString());

      return reply.send({
        message: 'Invite accepted',
        project,
      });
    }
  );

  // Decline invite
  fastify.post<{ Params: { token: string } }>(
    '/project-invites/:token/decline',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Projects', 'Invites'],
        description: 'Decline a project invite',
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
      const invite = await projectService.findInviteByToken(request.params.token);

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
          message: `Invite has already been ${invite.status}`,
        });
      }

      await projectService.updateInviteStatus(request.params.token, 'declined');

      return reply.send({ message: 'Invite declined' });
    }
  );

  // Get pending invites for current user
  fastify.get(
    '/invites',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Projects', 'Invites'],
        description: 'Get pending invites for the current user',
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

      const invites = await projectService.findInvitesByEmail(user.email);

      // Enrich with project info
      const enrichedInvites = await Promise.all(
        invites.map(async (invite) => {
          const project = await projectService.findById(invite.projectId.toString());
          const invitedByUser = await userService.findById(invite.invitedBy.toString());
          return {
            ...invite,
            project: project ? { _id: project._id, name: project.name } : null,
            invitedBy: invitedByUser ? userService.toPublic(invitedByUser) : null,
          };
        })
      );

      return reply.send({ invites: enrichedInvites });
    }
  );

  // Remove collaborator
  fastify.delete<{ Params: { projectId: string; userId: string } }>(
    '/projects/:projectId/collaborators/:userId',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Projects', 'Collaborators'],
        description: 'Remove a collaborator from the project',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['projectId', 'userId'],
          properties: {
            projectId: { type: 'string' },
            userId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { projectId, userId: targetUserId } = request.params;
      const currentUserId = request.user!.userId;

      // Users can remove themselves, or owner can remove anyone
      const role = await projectService.getUserRole(projectId, currentUserId);

      if (currentUserId !== targetUserId && role !== 'owner') {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Only the project owner can remove collaborators',
        });
      }

      await projectService.removeCollaborator(projectId, targetUserId);

      return reply.send({ message: 'Collaborator removed' });
    }
  );

  // Update collaborator role
  fastify.patch<{
    Params: { projectId: string; userId: string };
    Body: { role: string };
  }>(
    '/projects/:projectId/collaborators/:userId',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Projects', 'Collaborators'],
        description: 'Update collaborator role',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['projectId', 'userId'],
          properties: {
            projectId: { type: 'string' },
            userId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['role'],
          properties: {
            role: { type: 'string', enum: ['editor', 'viewer'] },
          },
        },
      },
    },
    async (request, reply) => {
      const { projectId, userId: targetUserId } = request.params;
      const { role: newRole } = request.body;
      const currentUserId = request.user!.userId;

      // Only owner can change roles
      const role = await projectService.getUserRole(projectId, currentUserId);

      if (role !== 'owner') {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Only the project owner can change collaborator roles',
        });
      }

      await projectService.updateCollaboratorRole(
        projectId,
        targetUserId,
        newRole as ProjectRole
      );

      return reply.send({ message: 'Collaborator role updated' });
    }
  );

  // Revoke pending invite
  fastify.delete<{ Params: { projectId: string; inviteId: string } }>(
    '/projects/:projectId/invites/:inviteId',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Projects', 'Invites'],
        description: 'Revoke a pending invite',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['projectId', 'inviteId'],
          properties: {
            projectId: { type: 'string' },
            inviteId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { projectId, inviteId } = request.params;

      // Check if user has permission
      const role = await projectService.getUserRole(projectId, request.user!.userId);

      if (!role || role === 'viewer') {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'You do not have permission to revoke invites',
        });
      }

      await projectService.revokeInvite(inviteId);

      return reply.send({ message: 'Invite revoked' });
    }
  );
};

export default projectsRoutes;
