import apiClient from './client';
import type { Team, TeamRole, TeamMember } from '../types';

export interface CreateTeamInput {
  name: string;
  description?: string;
  avatar?: string;
  settings?: {
    isPublic?: boolean;
    allowMemberInvites?: boolean;
    defaultProjectVisibility?: 'public' | 'team' | 'private';
  };
}

export interface UpdateTeamInput {
  name?: string;
  description?: string;
  avatar?: string;
  settings?: {
    isPublic?: boolean;
    allowMemberInvites?: boolean;
    defaultProjectVisibility?: 'public' | 'team' | 'private';
  };
}

export const teamsApi = {
  getAll: async (): Promise<{ teams: Team[] }> => {
    const response = await apiClient.get<{ teams: Team[] }>('/teams');
    return response.data;
  },

  getById: async (teamId: string): Promise<{ team: Team }> => {
    const response = await apiClient.get<{ team: Team }>(`/teams/${teamId}`);
    return response.data;
  },

  create: async (data: CreateTeamInput): Promise<{ team: Team }> => {
    const response = await apiClient.post<{ team: Team }>('/teams', data);
    return response.data;
  },

  update: async (teamId: string, data: UpdateTeamInput): Promise<{ team: Team }> => {
    const response = await apiClient.patch<{ team: Team }>(`/teams/${teamId}`, data);
    return response.data;
  },

  delete: async (teamId: string): Promise<void> => {
    await apiClient.delete(`/teams/${teamId}`);
  },

  getMembers: async (teamId: string): Promise<{ members: TeamMember[] }> => {
    const response = await apiClient.get<{ members: TeamMember[] }>(`/teams/${teamId}/members`);
    return response.data;
  },

  updateMemberRole: async (
    teamId: string,
    memberId: string,
    role: TeamRole
  ): Promise<{ team: Team }> => {
    const response = await apiClient.patch<{ team: Team }>(
      `/teams/${teamId}/members/${memberId}`,
      { role }
    );
    return response.data;
  },

  removeMember: async (teamId: string, memberId: string): Promise<{ team: Team }> => {
    const response = await apiClient.delete<{ team: Team }>(
      `/teams/${teamId}/members/${memberId}`
    );
    return response.data;
  },

  leave: async (teamId: string): Promise<void> => {
    await apiClient.post(`/teams/${teamId}/leave`);
  },
};
