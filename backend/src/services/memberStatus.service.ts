import { Collection, ObjectId } from 'mongodb';
import type { MemberStatus } from '../types/index.js';

export class MemberStatusService {
  constructor(private collection: Collection<MemberStatus>) {}

  // Create a new status for a user
  async create(
    userId: string,
    authorId: string,
    content: string
  ): Promise<MemberStatus> {
    const now = new Date();

    const status: Omit<MemberStatus, '_id'> = {
      userId: new ObjectId(userId),
      authorId: new ObjectId(authorId),
      content,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(status as MemberStatus);
    return { ...status, _id: result.insertedId } as MemberStatus;
  }

  // Get status history for a user
  async getByUserId(
    userId: string,
    limit: number = 50
  ): Promise<MemberStatus[]> {
    return this.collection
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  // Get latest status for a user
  async getLatestByUserId(userId: string): Promise<MemberStatus | null> {
    return this.collection.findOne(
      { userId: new ObjectId(userId) },
      { sort: { createdAt: -1 } }
    );
  }

  // Get latest status for multiple users
  async getLatestForUsers(
    userIds: string[]
  ): Promise<Map<string, MemberStatus>> {
    const objectIds = userIds.map((id) => new ObjectId(id));

    // Use aggregation to get the latest status for each user
    const pipeline = [
      { $match: { userId: { $in: objectIds } } },
      { $sort: { createdAt: -1 as const } },
      {
        $group: {
          _id: '$userId',
          statusId: { $first: '$_id' },
          authorId: { $first: '$authorId' },
          content: { $first: '$content' },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' },
        },
      },
    ];

    const results = await this.collection.aggregate(pipeline).toArray();

    const statusMap = new Map<string, MemberStatus>();
    for (const result of results) {
      statusMap.set(result._id.toString(), {
        _id: result.statusId,
        userId: result._id,
        authorId: result.authorId,
        content: result.content,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      });
    }

    return statusMap;
  }

  // Update a status
  async update(
    statusId: string,
    content: string
  ): Promise<MemberStatus | null> {
    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(statusId) },
      {
        $set: {
          content,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  // Delete a status
  async delete(statusId: string): Promise<boolean> {
    const result = await this.collection.deleteOne({
      _id: new ObjectId(statusId),
    });
    return result.deletedCount === 1;
  }
}
