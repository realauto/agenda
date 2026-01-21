import apiClient from './client';
import type { Update, UpdateCategory, UpdateMood, Attachment, FeedResponse } from '../types';

export interface CreateUpdateInput {
  projectId: string;
  content: string;
  category?: UpdateCategory;
  mood?: UpdateMood;
  attachments?: Attachment[];
}

export interface UpdateUpdateInput {
  content?: string;
  category?: UpdateCategory;
  mood?: UpdateMood;
  attachments?: Attachment[];
}

export interface FeedParams {
  cursor?: string;
  limit?: number;
  category?: UpdateCategory;
}

export const updatesApi = {
  create: async (data: CreateUpdateInput): Promise<{ update: Update }> => {
    const response = await apiClient.post<{ update: Update }>('/updates', data);
    return response.data;
  },

  getById: async (updateId: string): Promise<{ update: Update }> => {
    const response = await apiClient.get<{ update: Update }>(`/updates/${updateId}`);
    return response.data;
  },

  update: async (updateId: string, data: UpdateUpdateInput): Promise<{ update: Update }> => {
    const response = await apiClient.patch<{ update: Update }>(`/updates/${updateId}`, data);
    return response.data;
  },

  delete: async (updateId: string): Promise<void> => {
    await apiClient.delete(`/updates/${updateId}`);
  },

  getFeed: async (params?: FeedParams): Promise<FeedResponse> => {
    const response = await apiClient.get<FeedResponse>('/feed', { params });
    return response.data;
  },

  getTeamFeed: async (teamId: string, params?: FeedParams): Promise<FeedResponse> => {
    const response = await apiClient.get<FeedResponse>(`/feed/team/${teamId}`, { params });
    return response.data;
  },

  getProjectFeed: async (projectId: string, params?: FeedParams): Promise<FeedResponse> => {
    const response = await apiClient.get<FeedResponse>(`/feed/project/${projectId}`, { params });
    return response.data;
  },

  addReaction: async (updateId: string, emoji: string): Promise<{ update: Update }> => {
    const response = await apiClient.post<{ update: Update }>(
      `/updates/${updateId}/reactions`,
      { emoji }
    );
    return response.data;
  },

  removeReaction: async (updateId: string, emoji: string): Promise<{ update: Update }> => {
    const response = await apiClient.delete<{ update: Update }>(
      `/updates/${updateId}/reactions/${encodeURIComponent(emoji)}`
    );
    return response.data;
  },
};
