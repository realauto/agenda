import type { TeamRole } from '../types';

export interface RoleOption {
  value: TeamRole;
  label: string;
  description: string;
}

export const roles: RoleOption[] = [
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full access to manage team, projects, and members',
  },
  {
    value: 'member',
    label: 'Member',
    description: 'Can create and manage projects and updates',
  },
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'Can view projects and updates only',
  },
];

export const getRoleByValue = (value: TeamRole): RoleOption | undefined => {
  return roles.find((r) => r.value === value);
};

export const canManageTeam = (role: TeamRole): boolean => {
  return role === 'admin';
};

export const canManageProjects = (role: TeamRole): boolean => {
  return role === 'admin' || role === 'member';
};

export const canPostUpdates = (role: TeamRole): boolean => {
  return role === 'admin' || role === 'member';
};
