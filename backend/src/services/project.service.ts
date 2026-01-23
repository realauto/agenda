import { Collection, ObjectId } from 'mongodb';
import type { Project, ProjectRole, ProjectInvite, ProjectInviteStatus, AllUsersAccess } from '../types/index.js';
import type { CreateProjectInput, UpdateProjectInput } from '../models/Project.js';
import { generateSlug } from '../utils/index.js';
import crypto from 'crypto';

export class ProjectService {
  constructor(
    private collection: Collection<Project>,
    private inviteCollection?: Collection<ProjectInvite>
  ) {}

  async create(input: CreateProjectInput, ownerId: string): Promise<Project> {
    const now = new Date();

    const project: Omit<Project, '_id'> = {
      name: input.name,
      slug: generateSlug(input.name),
      description: input.description,
      ownerId: new ObjectId(ownerId),
      collaborators: [],
      status: 'active',
      visibility: input.visibility ?? 'collaborators',
      color: input.color,
      tags: input.tags ?? [],
      stats: {
        totalUpdates: 0,
      },
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(project as Project);
    return { ...project, _id: result.insertedId } as Project;
  }

  async findById(id: string): Promise<Project | null> {
    return this.collection.findOne({ _id: new ObjectId(id) });
  }

  async findBySlug(slug: string, ownerId: string): Promise<Project | null> {
    return this.collection.findOne({ slug, ownerId: new ObjectId(ownerId) });
  }

  // Get all projects where user is owner, collaborator, or allUsersAccess is set
  async findByUserId(userId: string): Promise<Project[]> {
    const userObjectId = new ObjectId(userId);
    return this.collection
      .find({
        $or: [
          { ownerId: userObjectId },
          { 'collaborators.userId': userObjectId },
          { allUsersAccess: { $in: ['view', 'edit'] } },
        ],
      })
      .sort({ updatedAt: -1 })
      .toArray();
  }

  // Get projects owned by user
  async findOwnedByUser(userId: string): Promise<Project[]> {
    return this.collection
      .find({ ownerId: new ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .toArray();
  }

  // Get projects where user is a collaborator (not owner)
  async findSharedWithUser(userId: string): Promise<Project[]> {
    return this.collection
      .find({ 'collaborators.userId': new ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .toArray();
  }

  async update(id: string, input: UpdateProjectInput): Promise<Project | null> {
    const updateData: Partial<Project> = {
      ...input,
      updatedAt: new Date(),
    };

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

  // Check if user has access to project
  async getUserRole(projectId: string, userId: string): Promise<ProjectRole | null> {
    const project = await this.findById(projectId);
    if (!project) return null;

    // Owner check
    if (project.ownerId.toString() === userId) {
      return 'owner';
    }

    // Explicit collaborator check
    const collaborator = project.collaborators.find(
      (c) => c.userId.toString() === userId
    );
    if (collaborator) {
      return collaborator.role;
    }

    // All-users access check (for authenticated users)
    if (project.allUsersAccess === 'edit') {
      return 'editor';
    }
    if (project.allUsersAccess === 'view') {
      return 'viewer';
    }

    return null;
  }

  // Add collaborator to project
  async addCollaborator(
    projectId: string,
    userId: string,
    role: ProjectRole
  ): Promise<Project | null> {
    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(projectId) },
      {
        $push: {
          collaborators: {
            userId: new ObjectId(userId),
            role,
            addedAt: new Date(),
          },
        },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  // Remove collaborator from project
  async removeCollaborator(projectId: string, userId: string): Promise<Project | null> {
    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(projectId) },
      {
        $pull: {
          collaborators: { userId: new ObjectId(userId) },
        },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  // Update collaborator role
  async updateCollaboratorRole(
    projectId: string,
    userId: string,
    role: ProjectRole
  ): Promise<Project | null> {
    const result = await this.collection.findOneAndUpdate(
      {
        _id: new ObjectId(projectId),
        'collaborators.userId': new ObjectId(userId),
      },
      {
        $set: {
          'collaborators.$.role': role,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  // Create project invite
  async createInvite(
    projectId: string,
    invitedBy: string,
    email: string,
    role: ProjectRole
  ): Promise<ProjectInvite | null> {
    if (!this.inviteCollection) return null;

    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite: Omit<ProjectInvite, '_id'> = {
      projectId: new ObjectId(projectId),
      invitedBy: new ObjectId(invitedBy),
      email: email.toLowerCase(),
      role,
      token,
      status: 'pending',
      expiresAt,
      createdAt: now,
    };

    const result = await this.inviteCollection.insertOne(invite as ProjectInvite);
    return { ...invite, _id: result.insertedId } as ProjectInvite;
  }

  // Find invite by token
  async findInviteByToken(token: string): Promise<ProjectInvite | null> {
    if (!this.inviteCollection) return null;
    return this.inviteCollection.findOne({ token });
  }

  // Find pending invites for a project
  async findInvitesByProjectId(projectId: string): Promise<ProjectInvite[]> {
    if (!this.inviteCollection) return [];
    return this.inviteCollection
      .find({ projectId: new ObjectId(projectId), status: 'pending' })
      .toArray();
  }

  // Find pending invites for an email
  async findInvitesByEmail(email: string): Promise<ProjectInvite[]> {
    if (!this.inviteCollection) return [];
    return this.inviteCollection
      .find({ email: email.toLowerCase(), status: 'pending' })
      .toArray();
  }

  // Update invite status
  async updateInviteStatus(
    token: string,
    status: ProjectInviteStatus,
    acceptedBy?: string
  ): Promise<ProjectInvite | null> {
    if (!this.inviteCollection) return null;

    const updateData: Partial<ProjectInvite> = { status };
    if (acceptedBy) {
      updateData.acceptedAt = new Date();
      updateData.acceptedBy = new ObjectId(acceptedBy);
    }

    return this.inviteCollection.findOneAndUpdate(
      { token },
      { $set: updateData },
      { returnDocument: 'after' }
    );
  }

  // Revoke invite
  async revokeInvite(inviteId: string): Promise<boolean> {
    if (!this.inviteCollection) return false;
    const result = await this.inviteCollection.deleteOne({
      _id: new ObjectId(inviteId),
    });
    return result.deletedCount === 1;
  }

  async incrementUpdateCount(id: string): Promise<void> {
    await this.collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $inc: { 'stats.totalUpdates': 1 },
        $set: {
          'stats.lastUpdateAt': new Date(),
          updatedAt: new Date(),
        },
      }
    );
  }

  async decrementUpdateCount(id: string): Promise<void> {
    await this.collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $inc: { 'stats.totalUpdates': -1 },
        $set: { updatedAt: new Date() },
      }
    );
  }

  async setPinnedUpdate(id: string, updateId: string | null): Promise<Project | null> {
    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          pinnedUpdateId: updateId ? new ObjectId(updateId) : undefined,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  async findByTeamId(teamId: string): Promise<Project[]> {
    return this.collection
      .find({ teamId: new ObjectId(teamId) })
      .sort({ updatedAt: -1 })
      .toArray();
  }

  // Enable public share and generate token
  async enablePublicShare(projectId: string): Promise<Project | null> {
    const project = await this.findById(projectId);
    if (!project) return null;

    // If already has a token, just enable it
    const token = project.publicShareToken || crypto.randomBytes(16).toString('hex');

    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(projectId) },
      {
        $set: {
          publicShareToken: token,
          publicShareEnabled: true,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  // Disable public share (keeps token for re-enabling)
  async disablePublicShare(projectId: string): Promise<Project | null> {
    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(projectId) },
      {
        $set: {
          publicShareEnabled: false,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  // Regenerate public share token
  async regeneratePublicShareToken(projectId: string): Promise<Project | null> {
    const token = crypto.randomBytes(16).toString('hex');

    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(projectId) },
      {
        $set: {
          publicShareToken: token,
          publicShareEnabled: true,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  // Find project by public share token
  async findByPublicShareToken(token: string): Promise<Project | null> {
    return this.collection.findOne({
      publicShareToken: token,
      publicShareEnabled: true,
    });
  }

  // Set all-users access level
  async setAllUsersAccess(
    projectId: string,
    access: AllUsersAccess | null
  ): Promise<Project | null> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (access === null) {
      // Remove the field entirely
      const result = await this.collection.findOneAndUpdate(
        { _id: new ObjectId(projectId) },
        {
          $unset: { allUsersAccess: '' },
          $set: { updatedAt: new Date() },
        },
        { returnDocument: 'after' }
      );
      return result;
    }

    updateData.allUsersAccess = access;

    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(projectId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result;
  }
}
