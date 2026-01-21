// User types
export interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  displayName?: string;
  bio?: string;
  lastActiveAt: string;
  createdAt: string;
}

export interface UserSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  theme: 'light' | 'dark' | 'system';
}

// Team types
export type TeamRole = 'admin' | 'member' | 'viewer';

export interface TeamMember {
  userId: string;
  role: TeamRole;
  joinedAt: string;
  user?: User;
}

export interface TeamSettings {
  isPublic: boolean;
  allowMemberInvites: boolean;
  defaultProjectVisibility: 'public' | 'team' | 'private';
}

export interface Team {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  avatar?: string;
  ownerId: string;
  members: TeamMember[];
  settings: TeamSettings;
  createdAt: string;
  updatedAt: string;
}

// Project types
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';
export type ProjectVisibility = 'public' | 'team' | 'private';

export interface ProjectStats {
  totalUpdates: number;
  lastUpdateAt?: string;
}

export interface Project {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  teamId: string;
  createdBy: string;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  color?: string;
  tags: string[];
  pinnedUpdateId?: string;
  stats: ProjectStats;
  createdAt: string;
  updatedAt: string;
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
  userId: string;
  emoji: string;
  createdAt: string;
}

export interface Update {
  _id: string;
  projectId: string;
  teamId: string;
  authorId: string;
  author?: User;
  content: string;
  contentHtml?: string;
  category: UpdateCategory;
  mood: UpdateMood;
  mentions: string[];
  attachments: Attachment[];
  reactions: Reaction[];
  isPinned: boolean;
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Invite types
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface Invite {
  _id: string;
  teamId: string;
  invitedBy: string;
  email: string;
  role: TeamRole;
  token: string;
  status: InviteStatus;
  expiresAt: string;
  acceptedAt?: string;
  acceptedBy?: string;
  createdAt: string;
  team?: {
    _id: string;
    name: string;
    avatar?: string;
  };
}

// Auth types
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

// API Response types
export interface FeedResponse {
  updates: Update[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}
