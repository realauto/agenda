import apiClient from './client';
import type { ProjectInvite, Project } from '../types';

// Project invites API for current user
export const invitesApi = {
  // Get pending invites for current user
  getPending: async (): Promise<{ invites: ProjectInvite[] }> => {
    const response = await apiClient.get<{ invites: ProjectInvite[] }>('/invites');
    return response.data;
  },

  // Accept a project invite
  accept: async (token: string): Promise<{ message: string; project: Project }> => {
    const response = await apiClient.post<{ message: string; project: Project }>(
      `/invites/${token}/accept`
    );
    return response.data;
  },

  // Decline a project invite
  decline: async (token: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(
      `/invites/${token}/decline`
    );
    return response.data;
  },
};
