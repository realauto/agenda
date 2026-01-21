import { Collection, ObjectId } from 'mongodb';
import type { Team, TeamMember, TeamRole } from '../types/index.js';
import type { CreateTeamInput, UpdateTeamInput } from '../models/Team.js';
import { generateSlug } from '../utils/index.js';

export class TeamService {
  constructor(private collection: Collection<Team>) {}

  async create(input: CreateTeamInput, ownerId: string): Promise<Team> {
    const now = new Date();
    const ownerObjectId = new ObjectId(ownerId);

    const team: Omit<Team, '_id'> = {
      name: input.name,
      slug: generateSlug(input.name),
      description: input.description,
      avatar: input.avatar,
      ownerId: ownerObjectId,
      members: [
        {
          userId: ownerObjectId,
          role: 'admin',
          joinedAt: now,
        },
      ],
      settings: {
        isPublic: input.settings?.isPublic ?? false,
        allowMemberInvites: input.settings?.allowMemberInvites ?? false,
        defaultProjectVisibility: input.settings?.defaultProjectVisibility ?? 'team',
      },
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(team as Team);
    return { ...team, _id: result.insertedId } as Team;
  }

  async findById(id: string): Promise<Team | null> {
    return this.collection.findOne({ _id: new ObjectId(id) });
  }

  async findBySlug(slug: string): Promise<Team | null> {
    return this.collection.findOne({ slug });
  }

  async findByUserId(userId: string): Promise<Team[]> {
    return this.collection
      .find({ 'members.userId': new ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .toArray();
  }

  async update(id: string, input: UpdateTeamInput): Promise<Team | null> {
    const updateData: Partial<Team> = {
      ...input,
      updatedAt: new Date(),
    };

    if (input.settings) {
      const team = await this.findById(id);
      if (team) {
        updateData.settings = { ...team.settings, ...input.settings };
      }
    }

    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }

  async addMember(teamId: string, userId: string, role: TeamRole): Promise<Team | null> {
    const member: TeamMember = {
      userId: new ObjectId(userId),
      role,
      joinedAt: new Date(),
    };

    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(teamId) },
      {
        $push: { members: member },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  async removeMember(teamId: string, userId: string): Promise<Team | null> {
    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(teamId) },
      {
        $pull: { members: { userId: new ObjectId(userId) } },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  async updateMemberRole(teamId: string, userId: string, role: TeamRole): Promise<Team | null> {
    const result = await this.collection.findOneAndUpdate(
      {
        _id: new ObjectId(teamId),
        'members.userId': new ObjectId(userId),
      },
      {
        $set: {
          'members.$.role': role,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  async isMember(teamId: string, userId: string): Promise<boolean> {
    const team = await this.collection.findOne({
      _id: new ObjectId(teamId),
      'members.userId': new ObjectId(userId),
    });
    return team !== null;
  }

  async getMemberRole(teamId: string, userId: string): Promise<TeamRole | null> {
    const team = await this.findById(teamId);
    if (!team) return null;

    const member = team.members.find((m) => m.userId.toString() === userId);
    return member?.role ?? null;
  }
}
