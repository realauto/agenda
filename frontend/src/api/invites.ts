import apiClient from './client';
import type { Invite, TeamRole, Team } from '../types';

export interface CreateInviteInput {
  email: string;
  role?: TeamRole;
}

export const invitesApi = {
  create: async (teamId: string, data: CreateInviteInput): Promise<{ invite: Invite }> => {
    const response = await apiClient.post<{ invite: Invite }>(
      `/teams/${teamId}/invites`,
      data
    );
    return response.data;
  },

  getByTeam: async (teamId: string): Promise<{ invites: Invite[] }> => {
    const response = await apiClient.get<{ invites: Invite[] }>(
      `/teams/${teamId}/invites`
    );
    return response.data;
  },

  revoke: async (teamId: string, inviteId: string): Promise<void> => {
    await apiClient.delete(`/teams/${teamId}/invites/${inviteId}`);
  },

  resend: async (teamId: string, inviteId: string): Promise<{ invite: Invite }> => {
    const response = await apiClient.post<{ invite: Invite }>(
      `/teams/${teamId}/invites/${inviteId}/resend`
    );
    return response.data;
  },

  getByToken: async (token: string): Promise<{ invite: Partial<Invite> }> => {
    const response = await apiClient.get<{ invite: Partial<Invite> }>(
      `/invites/${token}`
    );
    return response.data;
  },

  accept: async (token: string): Promise<{ message: string; team: Team }> => {
    const response = await apiClient.post<{ message: string; team: Team }>(
      `/invites/${token}/accept`
    );
    return response.data;
  },

  getPending: async (): Promise<{ invites: Invite[] }> => {
    const response = await apiClient.get<{ invites: Invite[] }>('/invites/pending');
    return response.data;
  },
};
