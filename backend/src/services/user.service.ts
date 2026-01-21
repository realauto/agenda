import { Collection, ObjectId } from 'mongodb';
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
    const updateData: Partial<User> = {
      ...input,
      updatedAt: new Date(),
    };

    if (input.settings) {
      const user = await this.findById(id);
      if (user) {
        updateData.settings = { ...user.settings, ...input.settings };
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
}
