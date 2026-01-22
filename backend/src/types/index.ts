import { ObjectId } from 'mongodb';

// User types
export interface User {
  _id: ObjectId;
  username: string;
  email: string;
  password: string;
  avatar?: string;
  displayName?: string;
  bio?: string;
  settings: UserSettings;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  theme: 'light' | 'dark' | 'system';
}

export interface PublicUser {
  _id: ObjectId;
  username: string;
  email: string;
  avatar?: string;
  displayName?: string;
  bio?: string;
  lastActiveAt: Date;
  createdAt: Date;
}

// Team types
export type TeamRole = 'admin' | 'member' | 'viewer';

export interface TeamMember {
  userId: ObjectId;
  role: TeamRole;
  joinedAt: Date;
}

export interface TeamSettings {
  isPublic: boolean;
  allowMemberInvites: boolean;
  defaultProjectVisibility: 'public' | 'team' | 'private';
}

export interface Team {
  _id: ObjectId;
  name: string;
  slug: string;
  description?: string;
  avatar?: string;
  ownerId: ObjectId;
  members: TeamMember[];
  settings: TeamSettings;
  createdAt: Date;
  updatedAt: Date;
}

// Project types
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';
export type ProjectVisibility = 'public' | 'private' | 'collaborators';
export type ProjectRole = 'owner' | 'editor' | 'viewer';

export interface ProjectCollaborator {
  userId: ObjectId;
  role: ProjectRole;
  addedAt: Date;
}

export interface ProjectStats {
  totalUpdates: number;
  lastUpdateAt?: Date;
}

export interface Project {
  _id: ObjectId;
  name: string;
  slug: string;
  description?: string;
  ownerId: ObjectId;
  collaborators: ProjectCollaborator[];
  teamId?: ObjectId; // Optional - for team organization
  status: ProjectStatus;
  visibility: ProjectVisibility;
  color?: string;
  tags: string[];
  pinnedUpdateId?: ObjectId;
  stats: ProjectStats;
  createdAt: Date;
  updatedAt: Date;
}

// Project Invite types
export type ProjectInviteStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface ProjectInvite {
  _id: ObjectId;
  projectId: ObjectId;
  invitedBy: ObjectId;
  email: string;
  role: ProjectRole;
  token: string;
  status: ProjectInviteStatus;
  expiresAt: Date;
  acceptedAt?: Date;
  acceptedBy?: ObjectId;
  createdAt: Date;
}

// Update types
export type UpdateCategory = 'progress' | 'blocker' | 'bug' | 'feature' | 'milestone' | 'general';
export type UpdateMood = 'positive' | 'neutral' | 'negative' | 'urgent';

export interface Attachment {
  type: 'image' | 'file' | 'link';
  url: string;
  name: string;
  thumbnail?: string;
}

export interface Reaction {
  userId: ObjectId;
  emoji: string;
  createdAt: Date;
}

export interface Comment {
  _id: ObjectId;
  authorId: ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isEdited: boolean;
}

export interface Update {
  _id: ObjectId;
  projectId: ObjectId;
  teamId?: ObjectId;
  authorId: ObjectId;
  content: string;
  contentHtml?: string;
  category: UpdateCategory;
  mood: UpdateMood;
  mentions: ObjectId[];
  attachments: Attachment[];
  reactions: Reaction[];
  comments: Comment[];
  isPinned: boolean;
  isEdited: boolean;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Invite types
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface Invite {
  _id: ObjectId;
  teamId: ObjectId;
  invitedBy: ObjectId;
  email: string;
  role: TeamRole;
  token: string;
  status: InviteStatus;
  expiresAt: Date;
  acceptedAt?: Date;
  acceptedBy?: ObjectId;
  createdAt: Date;
}

// JWT Payload
export interface JwtPayload {
  userId: string;
  username: string;
  type: 'access' | 'refresh';
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    cursor?: string;
  };
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}

// Request context - extended user type for JWT verification
export interface RequestUser {
  userId: string;
  username: string;
  type?: 'access' | 'refresh';
}
