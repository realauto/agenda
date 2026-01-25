import apiClient from './client';
import type { User, UserSettings, UserConnection, GlobalProjectAccess, MemberStatus } from '../types';

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

  // Create user by email with temporary password
  createByEmail: async (
    email: string,
    globalAccess?: GlobalProjectAccess | null
  ): Promise<{ user: User; temporaryPassword: string; message: string }> => {
    const response = await apiClient.post<{
      user: User;
      temporaryPassword: string;
      message: string;
    }>('/users/create-by-email', { email, globalAccess });
    return response.data;
  },

  // Get status history for a user
  getStatuses: async (
    userId: string,
    limit?: number
  ): Promise<{ statuses: MemberStatus[] }> => {
    const params = limit ? { limit } : {};
    const response = await apiClient.get<{ statuses: MemberStatus[] }>(
      `/users/${userId}/statuses`,
      { params }
    );
    return response.data;
  },

  // Add a status for a user
  addStatus: async (
    userId: string,
    content: string
  ): Promise<{ status: MemberStatus }> => {
    const response = await apiClient.post<{ status: MemberStatus }>(
      `/users/${userId}/statuses`,
      { content }
    );
    return response.data;
  },

  // Get latest statuses for all users
  getLatestStatuses: async (): Promise<{ statuses: Record<string, MemberStatus> }> => {
    const response = await apiClient.get<{ statuses: Record<string, MemberStatus> }>(
      '/users/statuses/latest'
    );
    return response.data;
  },

  // Delete a status
  deleteStatus: async (statusId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(
      `/users/statuses/${statusId}`
    );
    return response.data;
  },
};
