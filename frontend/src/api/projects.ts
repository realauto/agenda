import apiClient from './client';
import type { Project, ProjectStatus, ProjectVisibility } from '../types';

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

export const projectsApi = {
  getByTeam: async (teamId: string): Promise<{ projects: Project[] }> => {
    const response = await apiClient.get<{ projects: Project[] }>(
      `/teams/${teamId}/projects`
    );
    return response.data;
  },

  getById: async (projectId: string): Promise<{ project: Project }> => {
    const response = await apiClient.get<{ project: Project }>(
      `/projects/${projectId}`
    );
    return response.data;
  },

  create: async (teamId: string, data: CreateProjectInput): Promise<{ project: Project }> => {
    const response = await apiClient.post<{ project: Project }>(
      `/teams/${teamId}/projects`,
      data
    );
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
};
