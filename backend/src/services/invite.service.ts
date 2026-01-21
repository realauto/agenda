import { Collection, ObjectId } from 'mongodb';
import type { Invite, TeamRole } from '../types/index.js';
import type { CreateInviteInput } from '../models/Invite.js';
import { generateToken } from '../utils/index.js';

const INVITE_EXPIRY_DAYS = 7;

export class InviteService {
  constructor(private collection: Collection<Invite>) {}

  async create(input: CreateInviteInput, teamId: string, invitedBy: string): Promise<Invite> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const invite: Omit<Invite, '_id'> = {
      teamId: new ObjectId(teamId),
      invitedBy: new ObjectId(invitedBy),
      email: input.email.toLowerCase(),
      role: input.role ?? 'member',
      token: generateToken(),
      status: 'pending',
      expiresAt,
      createdAt: now,
    };

    const result = await this.collection.insertOne(invite as Invite);
    return { ...invite, _id: result.insertedId } as Invite;
  }

  async findById(id: string): Promise<Invite | null> {
    return this.collection.findOne({ _id: new ObjectId(id) });
  }

  async findByToken(token: string): Promise<Invite | null> {
    return this.collection.findOne({ token });
  }

  async findByTeamId(teamId: string): Promise<Invite[]> {
    return this.collection.find({ teamId: new ObjectId(teamId) }).sort({ createdAt: -1 }).toArray();
  }

  async findPendingByEmail(email: string): Promise<Invite[]> {
    return this.collection
      .find({
        email: email.toLowerCase(),
        status: 'pending',
        expiresAt: { $gt: new Date() },
      })
      .toArray();
  }

  async findPendingByEmailAndTeam(email: string, teamId: string): Promise<Invite | null> {
    return this.collection.findOne({
      email: email.toLowerCase(),
      teamId: new ObjectId(teamId),
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });
  }

  async accept(token: string, acceptedBy: string): Promise<Invite | null> {
    const result = await this.collection.findOneAndUpdate(
      {
        token,
        status: 'pending',
        expiresAt: { $gt: new Date() },
      },
      {
        $set: {
          status: 'accepted',
          acceptedAt: new Date(),
          acceptedBy: new ObjectId(acceptedBy),
        },
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  async revoke(id: string): Promise<Invite | null> {
    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id), status: 'pending' },
      { $set: { status: 'revoked' } },
      { returnDocument: 'after' }
    );

    return result;
  }

  async resend(id: string): Promise<Invite | null> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const result = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id), status: 'pending' },
      {
        $set: {
          token: generateToken(),
          expiresAt,
        },
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  async isValid(token: string): Promise<boolean> {
    const invite = await this.findByToken(token);
    if (!invite) return false;
    if (invite.status !== 'pending') return false;
    if (invite.expiresAt < new Date()) return false;
    return true;
  }

  async expireOld(): Promise<number> {
    const result = await this.collection.updateMany(
      {
        status: 'pending',
        expiresAt: { $lt: new Date() },
      },
      { $set: { status: 'expired' } }
    );

    return result.modifiedCount;
  }
}
