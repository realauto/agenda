import apiClient from './client';
import type { User, UserSettings } from '../types';

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
};
