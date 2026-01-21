import { Collection, ObjectId, Filter } from 'mongodb';
import type { Update, UpdateCategory, Reaction } from '../types/index.js';
import type { CreateUpdateInput, UpdateUpdateInput, FeedQueryInput } from '../models/Update.js';
import { extractMentions, contentToHtml, parsePagination, encodeCursor } from '../utils/index.js';

export class FeedService {
  constructor(
    private collection: Collection<Update>,
    private usersCollection: Collection<{ _id: ObjectId; username: string }>
  ) {}

  async create(input: CreateUpdateInput, teamId: string, authorId: string): Promise<Update> {
    const now = new Date();
    const mentionedUsernames = extractMentions(input.content);

    // Resolve usernames to user IDs
    const mentionedUsers = await this.usersCollection
      .find({ username: { $in: mentionedUsernames.map((u) => u.toLowerCase()) } })
      .toArray();
    const mentionIds = mentionedUsers.map((u) => u._id);

    const update: Omit<Update, '_id'> = {
      projectId: new ObjectId(input.projectId),
      teamId: new ObjectId(teamId),
      authorId: new ObjectId(authorId),
      content: input.content,
      contentHtml: contentToHtml(input.content),
      category: input.category ?? 'general',
      mood: input.mood ?? 'neutral',
      mentions: mentionIds,
      attachments: input.attachments ?? [],
      reactions: [],
      isPinned: false,
      isEdited: false,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(update as Update);
    return { ...update, _id: result.insertedId } as Update;
  }

  async findById(id: string): Promise<Update | null> {
    return this.collection.findOne({ _id: new ObjectId(id) });
  }

  async update(id: string, input: UpdateUpdateInput): Promise<Update | null> {
    const updateData: Partial<Update> = {
      ...input,
      isEdited: true,
      editedAt: new Date(),
      updatedAt: new Date(),
    };

    if (input.content) {
      const mentionedUsernames = extractMentions(input.content);
      const mentionedUsers = await this.usersCollection
        .find({ username: { $in: mentionedUsernames.map((u) => u.toLowerCase()) } })
        .toArray();
      updateData.mentions = mentionedUsers.map((u) => u._id);
      updateData.contentHtml = contentToHtml(input.content);
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

  async getFeed(
    teamIds: string[],
    query: FeedQueryInput
  ): Promise<{ updates: Update[]; hasMore: boolean; nextCursor?: string }> {
    const { limit, cursor } = parsePagination(query);
    const filter: Filter<Update> = {
      teamId: { $in: teamIds.map((id) => new ObjectId(id)) },
    };

    if (cursor) {
      filter._id = { $lt: cursor };
    }

    if (query.category) {
      filter.category = query.category;
    }

    const updates = await this.collection
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .toArray();

    const hasMore = updates.length > limit;
    if (hasMore) {
      updates.pop();
    }

    const nextCursor = hasMore && updates.length > 0 ? encodeCursor(updates[updates.length - 1]._id) : undefined;

    return { updates, hasMore, nextCursor };
  }

  async getTeamFeed(
    teamId: string,
    query: FeedQueryInput
  ): Promise<{ updates: Update[]; hasMore: boolean; nextCursor?: string }> {
    const { limit, cursor } = parsePagination(query);
    const filter: Filter<Update> = {
      teamId: new ObjectId(teamId),
    };

    if (cursor) {
      filter._id = { $lt: cursor };
    }

    if (query.category) {
      filter.category = query.category;
    }

    const updates = await this.collection
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .toArray();

    const hasMore = updates.length > limit;
    if (hasMore) {
      updates.pop();
    }

    const nextCursor = hasMore && updates.length > 0 ? encodeCursor(updates[updates.length - 1]._id) : undefined;

    return { updates, hasMore, nextCursor };
  }

  async getProjectFeed(
    projectId: string,
    query: FeedQueryInput
  ): Promise<{ updates: Update[]; hasMore: boolean; nextCursor?: string }> {
    const { limit, cursor } = parsePagination(query);
    const filter: Filter<Update> = {
      projectId: new ObjectId(projectId),
    };

    if (cursor) {
      filter._id = { $lt: cursor };
    }

    if (query.category) {
      filter.category = query.category;
    }

    const updates = await this.collection
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .toArray();

    const hasMore = updates.length > limit;
    if (hasMore) {
      updates.pop();
    }

    const nextCursor = hasMore && updates.length > 0 ? encodeCursor(updates[updates.length - 1]._id) : undefined;

    return { updates, hasMore, nextCursor };
  }

  async addReaction(updateId: string, userId: string, emoji: string): Promise<Update | null> {
    // Remove existing reaction from same user with same emoji
    await this.collection.updateOne(
      { _id: new ObjectId(updateId) },
      { $pull: { reactions: { userId: new ObjectId(userId), emoji } } }
    );

    const reaction: Reaction = {
      userId: new ObjectId(userId),
      emoji,
      createdAt: new Date(),
    };

    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(updateId) },
      {
        $push: { reactions: reaction },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  async removeReaction(updateId: string, userId: string, emoji: string): Promise<Update | null> {
    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(updateId) },
      {
        $pull: { reactions: { userId: new ObjectId(userId), emoji } },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  async setPinned(updateId: string, isPinned: boolean): Promise<Update | null> {
    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(updateId) },
      {
        $set: { isPinned, updatedAt: new Date() },
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  async deleteByProjectId(projectId: string): Promise<number> {
    const result = await this.collection.deleteMany({ projectId: new ObjectId(projectId) });
    return result.deletedCount;
  }

  async deleteByTeamId(teamId: string): Promise<number> {
    const result = await this.collection.deleteMany({ teamId: new ObjectId(teamId) });
    return result.deletedCount;
  }
}
