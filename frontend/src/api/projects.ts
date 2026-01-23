import apiClient from './client';
import type { Project, ProjectStatus, ProjectVisibility, ProjectRole, ProjectInvite, User, Update } from '../types';

export interface CreateProjectInput {
  name: string;
  description?: string;
  visibility?: ProjectVisibility;
  color?: string;
  tags?: string[];
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
  color?: string;
  tags?: string[];
}

export interface InviteCollaboratorInput {
  email: string;
  role?: 'editor' | 'viewer';
}

export interface CollaboratorsResponse {
  owner: User | null;
  collaborators: Array<{
    userId: string;
    role: ProjectRole;
    addedAt: string;
    user: User | null;
  }>;
  pendingInvites: ProjectInvite[];
}

export const projectsApi = {
  // Get all projects for current user
  getAll: async (filter?: 'all' | 'owned' | 'shared'): Promise<{ projects: Project[] }> => {
    const params = filter ? { filter } : {};
    const response = await apiClient.get<{ projects: Project[] }>('/projects', { params });
    return response.data;
  },

  getById: async (projectId: string): Promise<{ project: Project; role: ProjectRole }> => {
    const response = await apiClient.get<{ project: Project; role: ProjectRole }>(
      `/projects/${projectId}`
    );
    return response.data;
  },

  create: async (data: CreateProjectInput): Promise<{ project: Project }> => {
    const response = await apiClient.post<{ project: Project }>('/projects', data);
    return response.data;
  },

  update: async (projectId: string, data: UpdateProjectInput): Promise<{ project: Project }> => {
    const response = await apiClient.patch<{ project: Project }>(
      `/projects/${projectId}`,
      data
    );
    return response.data;
  },

  delete: async (projectId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}`);
  },

  // Collaborator management
  getCollaborators: async (projectId: string): Promise<CollaboratorsResponse> => {
    const response = await apiClient.get<CollaboratorsResponse>(
      `/projects/${projectId}/collaborators`
    );
    return response.data;
  },

  inviteCollaborator: async (
    projectId: string,
    data: InviteCollaboratorInput
  ): Promise<{ invite: ProjectInvite; message: string }> => {
    const response = await apiClient.post<{ invite: ProjectInvite; message: string }>(
      `/projects/${projectId}/invite`,
      data
    );
    return response.data;
  },

  removeCollaborator: async (projectId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/collaborators/${userId}`);
  },

  updateCollaboratorRole: async (
    projectId: string,
    userId: string,
    role: 'editor' | 'viewer'
  ): Promise<void> => {
    await apiClient.patch(`/projects/${projectId}/collaborators/${userId}`, { role });
  },

  revokeInvite: async (projectId: string, inviteId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/invites/${inviteId}`);
  },

  // Add collaborator directly (for existing users)
  addCollaborator: async (
    projectId: string,
    userId: string,
    role: 'editor' | 'viewer'
  ): Promise<{ message: string; collaborator: { userId: string; role: ProjectRole; user: User } }> => {
    const response = await apiClient.post<{
      message: string;
      collaborator: { userId: string; role: ProjectRole; user: User };
    }>(`/projects/${projectId}/collaborators`, { userId, role });
    return response.data;
  },

  // Set all-users access level
  setAllUsersAccess: async (
    projectId: string,
    access: 'view' | 'edit' | null
  ): Promise<{ project: Project }> => {
    const response = await apiClient.patch<{ project: Project }>(
      `/projects/${projectId}/all-users-access`,
      { allUsersAccess: access }
    );
    return response.data;
  },

  // Public share link methods
  enablePublicShare: async (
    projectId: string
  ): Promise<{ publicShareToken: string; publicShareEnabled: boolean }> => {
    const response = await apiClient.post<{ publicShareToken: string; publicShareEnabled: boolean }>(
      `/projects/${projectId}/public-share`
    );
    return response.data;
  },

  disablePublicShare: async (projectId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/public-share`);
  },

  regeneratePublicShareToken: async (
    projectId: string
  ): Promise<{ publicShareToken: string; publicShareEnabled: boolean }> => {
    const response = await apiClient.post<{ publicShareToken: string; publicShareEnabled: boolean }>(
      `/projects/${projectId}/public-share/regenerate`
    );
    return response.data;
  },
};

// Invites API (for current user's pending invites)
export const invitesApi = {
  getPending: async (): Promise<{ invites: ProjectInvite[] }> => {
    const response = await apiClient.get<{ invites: ProjectInvite[] }>('/invites');
    return response.data;
  },

  accept: async (token: string): Promise<{ message: string; project: Project }> => {
    const response = await apiClient.post<{ message: string; project: Project }>(
      `/invites/${token}/accept`
    );
    return response.data;
  },

  decline: async (token: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/invites/${token}/decline`);
    return response.data;
  },
};

// Public API (no authentication required)
export const publicApi = {
  getProject: async (token: string): Promise<{ project: Project }> => {
    const response = await apiClient.get<{ project: Project }>(`/public/projects/${token}`);
    return response.data;
  },

  getProjectFeed: async (
    token: string,
    params?: { cursor?: string; limit?: number }
  ): Promise<{ updates: Update[]; hasMore: boolean; nextCursor?: string }> => {
    const response = await apiClient.get<{ updates: Update[]; hasMore: boolean; nextCursor?: string }>(
      `/public/projects/${token}/feed`,
      { params }
    );
    return response.data;
  },
};
