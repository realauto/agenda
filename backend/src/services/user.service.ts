import { Collection, ObjectId } from 'mongodb';
import type { Project } from '../types/index.js';
import type { User, PublicUser } from '../types/index.js';
import type { CreateUserInput, UpdateUserInput } from '../models/User.js';
import { hashPassword } from '../utils/index.js';

export class UserService {
  constructor(private collection: Collection<User>) {}

  async create(input: CreateUserInput): Promise<User> {
    const hashedPassword = await hashPassword(input.password);

    const now = new Date();
    const user: Omit<User, '_id'> = {
      username: input.username.toLowerCase(),
      email: input.email.toLowerCase(),
      password: hashedPassword,
      displayName: input.displayName || input.username,
      settings: {
        emailNotifications: true,
        pushNotifications: true,
        theme: 'system',
      },
      lastActiveAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(user as User);
    return { ...user, _id: result.insertedId } as User;
  }

  async findById(id: string): Promise<User | null> {
    return this.collection.findOne({ _id: new ObjectId(id) });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.collection.findOne({ email: email.toLowerCase() });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.collection.findOne({ username: username.toLowerCase() });
  }

  async findByIds(ids: string[]): Promise<User[]> {
    const objectIds = ids.map((id) => new ObjectId(id));
    return this.collection.find({ _id: { $in: objectIds } }).toArray();
  }

  async update(id: string, input: UpdateUserInput): Promise<User | null> {
    const { settings, ...rest } = input;
    const updateData: Record<string, unknown> = {
      ...rest,
      updatedAt: new Date(),
    };

    if (settings) {
      const user = await this.findById(id);
      if (user) {
        updateData.settings = { ...user.settings, ...settings };
      }
    }

    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result;
  }

  async updateLastActive(id: string): Promise<void> {
    await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { lastActiveAt: new Date() } }
    );
  }

  async emailExists(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return user !== null;
  }

  async usernameExists(username: string): Promise<boolean> {
    const user = await this.findByUsername(username);
    return user !== null;
  }

  toPublic(user: User): PublicUser {
    return {
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      displayName: user.displayName,
      bio: user.bio,
      lastActiveAt: user.lastActiveAt,
      createdAt: user.createdAt,
    };
  }

  // Search users by username, email, or displayName
  async searchUsers(
    query: string,
    excludeUserIds: string[] = [],
    limit: number = 10
  ): Promise<PublicUser[]> {
    const excludeObjectIds = excludeUserIds.map((id) => new ObjectId(id));
    const regex = new RegExp(query, 'i');

    const users = await this.collection
      .find({
        $and: [
          { _id: { $nin: excludeObjectIds } },
          {
            $or: [
              { username: { $regex: regex } },
              { email: { $regex: regex } },
              { displayName: { $regex: regex } },
            ],
          },
        ],
      })
      .limit(limit)
      .toArray();

    return users.map((u) => this.toPublic(u));
  }

  // Get users who share projects with the given user
  async getConnectedUsers(
    userId: string,
    projectsCollection: Collection<Project>
  ): Promise<{ user: PublicUser; sharedProjectCount: number }[]> {
    const userObjectId = new ObjectId(userId);

    // Find all projects where user is owner or collaborator
    const projects = await projectsCollection
      .find({
        $or: [
          { ownerId: userObjectId },
          { 'collaborators.userId': userObjectId },
        ],
      })
      .toArray();

    // Collect all unique user IDs from these projects
    const userIdSet = new Set<string>();
    const userProjectCounts = new Map<string, number>();

    for (const project of projects) {
      const ownerId = project.ownerId.toString();
      if (ownerId !== userId) {
        userIdSet.add(ownerId);
        userProjectCounts.set(ownerId, (userProjectCounts.get(ownerId) || 0) + 1);
      }

      for (const collab of project.collaborators || []) {
        const collabId = collab.userId.toString();
        if (collabId !== userId) {
          userIdSet.add(collabId);
          userProjectCounts.set(collabId, (userProjectCounts.get(collabId) || 0) + 1);
        }
      }
    }

    // Fetch user details
    const userIds = Array.from(userIdSet);
    if (userIds.length === 0) return [];

    const users = await this.findByIds(userIds);

    return users
      .map((user) => ({
        user: this.toPublic(user),
        sharedProjectCount: userProjectCounts.get(user._id.toString()) || 0,
      }))
      .sort((a, b) => b.sharedProjectCount - a.sharedProjectCount);
  }
}
