import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { MongoClient, Db, Collection } from 'mongodb';
import { databaseConfig } from '../config/index.js';
import type { User, Team, Project, Update, Invite, ProjectInvite } from '../types/index.js';

declare module 'fastify' {
  interface FastifyInstance {
    mongo: {
      client: MongoClient;
      db: Db;
      collections: {
        users: Collection<User>;
        teams: Collection<Team>;
        projects: Collection<Project>;
        updates: Collection<Update>;
        invites: Collection<Invite>;
        projectInvites: Collection<ProjectInvite>;
      };
    };
  }
}

const mongoPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const client = new MongoClient(databaseConfig.uri, databaseConfig.options);

  try {
    await client.connect();
    fastify.log.info('Connected to MongoDB');

    const db = client.db();

    // Create collections with references
    const collections = {
      users: db.collection<User>('users'),
      teams: db.collection<Team>('teams'),
      projects: db.collection<Project>('projects'),
      updates: db.collection<Update>('updates'),
      invites: db.collection<Invite>('invites'),
      projectInvites: db.collection<ProjectInvite>('projectInvites'),
    };

    // Create indexes
    await collections.users.createIndex({ email: 1 }, { unique: true });
    await collections.users.createIndex({ username: 1 }, { unique: true });
    await collections.teams.createIndex({ slug: 1 }, { unique: true });
    await collections.teams.createIndex({ 'members.userId': 1 });
    await collections.projects.createIndex({ ownerId: 1 });
    await collections.projects.createIndex({ 'collaborators.userId': 1 });
    await collections.projects.createIndex({ slug: 1, ownerId: 1 }, { unique: true });
    await collections.projects.createIndex({ teamId: 1 }, { sparse: true });
    await collections.updates.createIndex({ projectId: 1, createdAt: -1 });
    await collections.updates.createIndex({ teamId: 1, createdAt: -1 });
    await collections.updates.createIndex({ authorId: 1, createdAt: -1 });
    await collections.invites.createIndex({ token: 1 }, { unique: true });
    await collections.invites.createIndex({ email: 1, teamId: 1 });
    await collections.projectInvites.createIndex({ token: 1 }, { unique: true });
    await collections.projectInvites.createIndex({ email: 1, projectId: 1 });
    await collections.projectInvites.createIndex({ projectId: 1 });

    fastify.decorate('mongo', {
      client,
      db,
      collections,
    });

    fastify.addHook('onClose', async () => {
      await client.close();
      fastify.log.info('MongoDB connection closed');
    });
  } catch (error) {
    fastify.log.error({ err: error }, 'Failed to connect to MongoDB');
    throw error;
  }
};

export default fp(mongoPlugin, {
  name: 'mongodb',
});
