import { create } from 'zustand';
import type { Team, TeamMember, TeamRole } from '../types';
import { teamsApi, type CreateTeamInput, type UpdateTeamInput } from '../api/teams';

interface TeamState {
  teams: Team[];
  currentTeam: Team | null;
  members: TeamMember[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTeams: () => Promise<void>;
  fetchTeam: (teamId: string) => Promise<void>;
  fetchMembers: (teamId: string) => Promise<void>;
  createTeam: (data: CreateTeamInput) => Promise<Team>;
  updateTeam: (teamId: string, data: UpdateTeamInput) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  updateMemberRole: (teamId: string, memberId: string, role: TeamRole) => Promise<void>;
  removeMember: (teamId: string, memberId: string) => Promise<void>;
  leaveTeam: (teamId: string) => Promise<void>;
  setCurrentTeam: (team: Team | null) => void;
  clearError: () => void;
}

export const useTeamStore = create<TeamState>((set, get) => ({
  teams: [],
  currentTeam: null,
  members: [],
  isLoading: false,
  error: null,

  fetchTeams: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await teamsApi.getAll();
      set({ teams: response.teams, isLoading: false });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch teams';
      set({ error: message, isLoading: false });
    }
  },

  fetchTeam: async (teamId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await teamsApi.getById(teamId);
      set({ currentTeam: response.team, isLoading: false });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch team';
      set({ error: message, isLoading: false });
    }
  },

  fetchMembers: async (teamId: string) => {
    try {
      const response = await teamsApi.getMembers(teamId);
      set({ members: response.members });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch members';
      set({ error: message });
    }
  },

  createTeam: async (data: CreateTeamInput) => {
    set({ isLoading: true, error: null });
    try {
      const response = await teamsApi.create(data);
      set((state) => ({
        teams: [...state.teams, response.team],
        isLoading: false,
      }));
      return response.team;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create team';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  updateTeam: async (teamId: string, data: UpdateTeamInput) => {
    set({ isLoading: true, error: null });
    try {
      const response = await teamsApi.update(teamId, data);
      set((state) => ({
        teams: state.teams.map((t) => (t._id === teamId ? response.team : t)),
        currentTeam: state.currentTeam?._id === teamId ? response.team : state.currentTeam,
        isLoading: false,
      }));
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update team';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  deleteTeam: async (teamId: string) => {
    set({ isLoading: true, error: null });
    try {
      await teamsApi.delete(teamId);
      set((state) => ({
        teams: state.teams.filter((t) => t._id !== teamId),
        currentTeam: state.currentTeam?._id === teamId ? null : state.currentTeam,
        isLoading: false,
      }));
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete team';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  updateMemberRole: async (teamId: string, memberId: string, role: TeamRole) => {
    try {
      const response = await teamsApi.updateMemberRole(teamId, memberId, role);
      set((state) => ({
        currentTeam: state.currentTeam?._id === teamId ? response.team : state.currentTeam,
        members: state.members.map((m) =>
          m.userId === memberId ? { ...m, role } : m
        ),
      }));
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update member role';
      set({ error: message });
      throw new Error(message);
    }
  },

  removeMember: async (teamId: string, memberId: string) => {
    try {
      await teamsApi.removeMember(teamId, memberId);
      set((state) => ({
        members: state.members.filter((m) => m.userId !== memberId),
      }));
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to remove member';
      set({ error: message });
      throw new Error(message);
    }
  },

  leaveTeam: async (teamId: string) => {
    try {
      await teamsApi.leave(teamId);
      set((state) => ({
        teams: state.teams.filter((t) => t._id !== teamId),
        currentTeam: state.currentTeam?._id === teamId ? null : state.currentTeam,
      }));
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to leave team';
      set({ error: message });
      throw new Error(message);
    }
  },

  setCurrentTeam: (team: Team | null) => set({ currentTeam: team }),

  clearError: () => set({ error: null }),
}));
