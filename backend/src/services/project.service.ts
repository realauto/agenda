import { Collection, ObjectId } from 'mongodb';
import type { Project } from '../types/index.js';
import type { CreateProjectInput, UpdateProjectInput } from '../models/Project.js';
import { generateSlug } from '../utils/index.js';

export class ProjectService {
  constructor(private collection: Collection<Project>) {}

  async create(input: CreateProjectInput, teamId: string, createdBy: string): Promise<Project> {
    const now = new Date();

    const project: Omit<Project, '_id'> = {
      name: input.name,
      slug: generateSlug(input.name),
      description: input.description,
      teamId: new ObjectId(teamId),
      createdBy: new ObjectId(createdBy),
      status: 'active',
      visibility: input.visibility ?? 'team',
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

  async findBySlug(slug: string, teamId: string): Promise<Project | null> {
    return this.collection.findOne({ slug, teamId: new ObjectId(teamId) });
  }

  async findByTeamId(teamId: string): Promise<Project[]> {
    return this.collection
      .find({ teamId: new ObjectId(teamId) })
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
}
