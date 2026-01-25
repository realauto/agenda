import apiClient from './client';
import type { User, UserSettings, UserConnection, GlobalProjectAccess } from '../types';

export interface UpdateUserInput {
  displayName?: string;
  bio?: string;
  avatar?: string;
  settings?: Partial<UserSettings>;
}

export const usersApi = {
  getById: async (userId: string): Promise<{ user: User }> => {
    const response = await apiClient.get<{ user: User }>(`/users/${userId}`);
    return response.data;
  },

  getByUsername: async (username: string): Promise<{ user: User }> => {
    const response = await apiClient.get<{ user: User }>(`/users/username/${username}`);
    return response.data;
  },

  updateMe: async (data: UpdateUserInput): Promise<{ user: User }> => {
    const response = await apiClient.patch<{ user: User }>('/users/me', data);
    return response.data;
  },

  // Search users by username, email, or display name
  searchUsers: async (
    query: string,
    excludeIds?: string[]
  ): Promise<{ users: User[] }> => {
    const params: Record<string, string> = { q: query };
    if (excludeIds?.length) {
      params.exclude = excludeIds.join(',');
    }
    const response = await apiClient.get<{ users: User[] }>('/users/search', { params });
    return response.data;
  },

  // Get connected users (users who share projects with current user)
  getConnections: async (): Promise<{ connections: UserConnection[] }> => {
    const response = await apiClient.get<{ connections: UserConnection[] }>('/users/connections');
    return response.data;
  },

  // Set global project access for a user
  setGlobalProjectAccess: async (
    userId: string,
    access: GlobalProjectAccess | null
  ): Promise<{ user: User }> => {
    const response = await apiClient.put<{ user: User }>(
      `/users/${userId}/global-access`,
      { access }
    );
    return response.data;
  },

  // Get users with global project access
  getUsersWithGlobalAccess: async (): Promise<{ users: User[] }> => {
    const response = await apiClient.get<{ users: User[] }>('/users/global-access/list');
    return response.data;
  },
};
