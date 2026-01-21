import { useState, useEffect, useCallback } from 'react';
import type { Project } from '../types';
import { projectsApi, type CreateProjectInput, type UpdateProjectInput } from '../api/projects';

export function useProjects(teamId: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!teamId) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await projectsApi.getByTeam(teamId);
      setProjects(response.projects);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to fetch projects';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = async (data: CreateProjectInput): Promise<Project> => {
    const response = await projectsApi.create(teamId, data);
    setProjects((prev) => [...prev, response.project]);
    return response.project;
  };

  return {
    projects,
    isLoading,
    error,
    fetchProjects,
    createProject,
    clearError: () => setError(null),
  };
}

export function useProject(projectId: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await projectsApi.getById(projectId);
      setProject(response.project);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to fetch project';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const updateProject = async (data: UpdateProjectInput): Promise<void> => {
    const response = await projectsApi.update(projectId, data);
    setProject(response.project);
  };

  const deleteProject = async (): Promise<void> => {
    await projectsApi.delete(projectId);
    setProject(null);
  };

  return {
    project,
    isLoading,
    error,
    fetchProject,
    updateProject,
    deleteProject,
    clearError: () => setError(null),
  };
}
