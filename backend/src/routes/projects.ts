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
import { generateRandomPassword } from '../utils/index.js';
import type { ProjectRole } from '../types/index.js';

const projectsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const projectService = new ProjectService(
    fastify.mongo.collections.projects,
    fastify.mongo.collections.projectInvites
  );
  // Set users collection for global access checks
  projectService.setUsersCollection(fastify.mongo.collections.users);

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

      // Get latest update for each project
      const projectIds = projects.map((p) => p._id.toString());
      const latestUpdatesMap = await feedService.getLatestUpdatesByProjectIds(projectIds);

      // Enrich with author info for latest updates
      const authorIds = [...new Set(
        Array.from(latestUpdatesMap.values())
          .filter((u) => u?.authorId)
          .map((u) => u.authorId.toString())
      )];
      const authors = authorIds.length > 0 ? await userService.findByIds(authorIds) : [];
      const authorsMap = new Map(authors.map((a) => [a._id.toString(), userService.toPublic(a)]));

      const enrichedProjects = projects.map((project) => {
        const latestUpdate = latestUpdatesMap.get(project._id.toString());
        return {
          ...project,
          latestUpdate: latestUpdate
            ? {
                _id: latestUpdate._id,
                content: latestUpdate.content,
                authorId: latestUpdate.authorId,
                author: authorsMap.get(latestUpdate.authorId.toString()) || null,
                createdAt: latestUpdate.createdAt,
              }
            : null,
        };
      });

      return reply.send({ projects: enrichedProjects });
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

      // Check if user exists
      let user = await userService.findByEmail(email);
      let temporaryPassword: string | undefined;

      if (user) {
        // Check if user is already a collaborator
        const isCollaborator = project!.collaborators.some(
          (c) => c.userId.toString() === user!._id.toString()
        );
        if (isCollaborator) {
          return reply.code(400).send({
            statusCode: 400,
            error: 'Bad Request',
            message: 'This user is already a collaborator',
          });
        }
      } else {
        // Auto-create user with random password
        temporaryPassword = generateRandomPassword(12);
        user = await userService.createFromEmail(email, temporaryPassword);
      }

      // Add as collaborator directly
      await projectService.addCollaborator(
        request.params.projectId,
        user._id.toString(),
        inviteRole as ProjectRole
      );

      return reply.code(201).send({
        user: userService.toPublic(user),
        temporaryPassword,
        message: temporaryPassword
          ? 'User created and added as collaborator'
          : 'User added as collaborator',
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

  // Add collaborator directly (for existing users)
  fastify.post<{
    Params: { projectId: string };
    Body: { userId: string; role: 'editor' | 'viewer' };
  }>(
    '/projects/:projectId/collaborators',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Projects', 'Collaborators'],
        description: 'Add an existing user as collaborator directly (no invite)',
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
          required: ['userId', 'role'],
          properties: {
            userId: { type: 'string' },
            role: { type: 'string', enum: ['editor', 'viewer'] },
          },
        },
      },
    },
    async (request, reply) => {
      const { projectId } = request.params;
      const { userId: targetUserId, role } = request.body;

      // Check permission (owner or editor can add)
      const userRole = await projectService.getUserRole(projectId, request.user!.userId);
      if (!userRole || userRole === 'viewer') {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'You do not have permission to add collaborators',
        });
      }

      const project = await projectService.findById(projectId);
      if (!project) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Project not found',
        });
      }

      // Check if user exists
      const targetUser = await userService.findById(targetUserId);
      if (!targetUser) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'User not found',
        });
      }

      // Check if already owner
      if (project.ownerId.toString() === targetUserId) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'User is the project owner',
        });
      }

      // Check if already collaborator
      if (project.collaborators.some((c) => c.userId.toString() === targetUserId)) {
        return reply.code(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'User is already a collaborator',
        });
      }

      // Add directly
      await projectService.addCollaborator(projectId, targetUserId, role as ProjectRole);

      return reply.code(201).send({
        message: 'Collaborator added',
        collaborator: {
          userId: targetUserId,
          role,
          user: userService.toPublic(targetUser),
        },
      });
    }
  );

  // Set all-users access level
  fastify.patch<{
    Params: { projectId: string };
    Body: { allUsersAccess: 'view' | 'edit' | null };
  }>(
    '/projects/:projectId/all-users-access',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Projects', 'Sharing'],
        description: 'Set all-users access level (authenticated users only)',
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
          required: ['allUsersAccess'],
          properties: {
            allUsersAccess: { type: ['string', 'null'], enum: ['view', 'edit', null] },
          },
        },
      },
    },
    async (request, reply) => {
      const { projectId } = request.params;
      const { allUsersAccess } = request.body;

      // Only owner can change all-users access
      const role = await projectService.getUserRole(projectId, request.user!.userId);
      if (role !== 'owner') {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Only the project owner can change all-users access',
        });
      }

      const project = await projectService.setAllUsersAccess(projectId, allUsersAccess);
      if (!project) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Project not found',
        });
      }

      return reply.send({ project });
    }
  );

  // Enable public share link
  fastify.post<{ Params: { projectId: string } }>(
    '/projects/:projectId/public-share',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Projects', 'Sharing'],
        description: 'Enable public share link for the project',
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
      const { projectId } = request.params;
      const userId = request.user!.userId;

      // Only owner or editor can enable public sharing
      const role = await projectService.getUserRole(projectId, userId);
      if (!role || role === 'viewer') {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'You do not have permission to manage public sharing',
        });
      }

      const project = await projectService.enablePublicShare(projectId);
      if (!project) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Project not found',
        });
      }

      return reply.send({
        publicShareToken: project.publicShareToken,
        publicShareEnabled: project.publicShareEnabled,
      });
    }
  );

  // Disable public share link
  fastify.delete<{ Params: { projectId: string } }>(
    '/projects/:projectId/public-share',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Projects', 'Sharing'],
        description: 'Disable public share link for the project',
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
      const { projectId } = request.params;
      const userId = request.user!.userId;

      // Only owner or editor can disable public sharing
      const role = await projectService.getUserRole(projectId, userId);
      if (!role || role === 'viewer') {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'You do not have permission to manage public sharing',
        });
      }

      await projectService.disablePublicShare(projectId);

      return reply.send({ message: 'Public sharing disabled' });
    }
  );

  // Regenerate public share token
  fastify.post<{ Params: { projectId: string } }>(
    '/projects/:projectId/public-share/regenerate',
    {
      onRequest: [authenticate],
      schema: {
        tags: ['Projects', 'Sharing'],
        description: 'Regenerate public share token (invalidates old links)',
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
      const { projectId } = request.params;
      const userId = request.user!.userId;

      // Only owner or editor can regenerate token
      const role = await projectService.getUserRole(projectId, userId);
      if (!role || role === 'viewer') {
        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'You do not have permission to manage public sharing',
        });
      }

      const project = await projectService.regeneratePublicShareToken(projectId);
      if (!project) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Project not found',
        });
      }

      return reply.send({
        publicShareToken: project.publicShareToken,
        publicShareEnabled: project.publicShareEnabled,
      });
    }
  );

  // Public view - Get project by share token (NO AUTH REQUIRED)
  fastify.get<{ Params: { token: string } }>(
    '/public/projects/:token',
    {
      schema: {
        tags: ['Projects', 'Public'],
        description: 'View a project via public share link (no authentication required)',
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
      const { token } = request.params;

      const project = await projectService.findByPublicShareToken(token);
      if (!project) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Project not found or public sharing is disabled',
        });
      }

      // Get owner info
      const owner = await userService.findById(project.ownerId.toString());

      // Return limited project info for public view
      return reply.send({
        project: {
          _id: project._id,
          name: project.name,
          description: project.description,
          status: project.status,
          color: project.color,
          tags: project.tags,
          stats: project.stats,
          owner: owner ? userService.toPublic(owner) : null,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        },
      });
    }
  );

  // Public view - Get project feed by share token (NO AUTH REQUIRED)
  fastify.get<{ Params: { token: string }; Querystring: { cursor?: string; limit?: number } }>(
    '/public/projects/:token/feed',
    {
      schema: {
        tags: ['Projects', 'Public'],
        description: 'View project updates via public share link (no authentication required)',
        params: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            cursor: { type: 'string' },
            limit: { type: 'integer', minimum: 1, maximum: 50 },
          },
        },
      },
    },
    async (request, reply) => {
      const { token } = request.params;

      const project = await projectService.findByPublicShareToken(token);
      if (!project) {
        return reply.code(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Project not found or public sharing is disabled',
        });
      }

      const result = await feedService.getProjectFeed(project._id.toString(), {
        cursor: request.query.cursor,
        limit: request.query.limit,
      });

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
};

export default projectsRoutes;
