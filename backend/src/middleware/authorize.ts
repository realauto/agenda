import { FastifyRequest, FastifyReply } from 'fastify';
import { ObjectId } from 'mongodb';
import type { TeamRole } from '../types/index.js';

type RoleLevel = { [key in TeamRole]: number };

const ROLE_LEVELS: RoleLevel = {
  viewer: 1,
  member: 2,
  admin: 3,
};

export function authorizeTeamRole(requiredRole: TeamRole) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const teamId = (request.params as { teamId?: string }).teamId;
    const userId = request.user?.userId;

    if (!teamId || !userId) {
      reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Team ID and user authentication required',
      });
      return;
    }

    const team = await request.server.mongo.collections.teams.findOne({
      _id: new ObjectId(teamId),
    });

    if (!team) {
      reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Team not found',
      });
      return;
    }

    const member = team.members.find((m) => m.userId.toString() === userId);

    if (!member) {
      reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You are not a member of this team',
      });
      return;
    }

    if (ROLE_LEVELS[member.role] < ROLE_LEVELS[requiredRole]) {
      reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: `Requires ${requiredRole} role or higher`,
      });
      return;
    }
  };
}

export function authorizeTeamOwner() {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const teamId = (request.params as { teamId?: string }).teamId;
    const userId = request.user?.userId;

    if (!teamId || !userId) {
      reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Team ID and user authentication required',
      });
      return;
    }

    const team = await request.server.mongo.collections.teams.findOne({
      _id: new ObjectId(teamId),
    });

    if (!team) {
      reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Team not found',
      });
      return;
    }

    if (team.ownerId.toString() !== userId) {
      reply.code(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Only the team owner can perform this action',
      });
      return;
    }
  };
}
