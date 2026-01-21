import { useEffect } from 'react';
import { useTeamStore } from '../store/teamStore';

export function useTeams() {
  const { teams, isLoading, error, fetchTeams, createTeam, clearError } = useTeamStore();

  useEffect(() => {
    fetchTeams();
  }, []);

  return {
    teams,
    isLoading,
    error,
    fetchTeams,
    createTeam,
    clearError,
  };
}

export function useTeam(teamId: string) {
  const {
    currentTeam,
    members,
    isLoading,
    error,
    fetchTeam,
    fetchMembers,
    updateTeam,
    deleteTeam,
    updateMemberRole,
    removeMember,
    leaveTeam,
    clearError,
  } = useTeamStore();

  useEffect(() => {
    if (teamId) {
      fetchTeam(teamId);
      fetchMembers(teamId);
    }
  }, [teamId]);

  return {
    team: currentTeam,
    members,
    isLoading,
    error,
    updateTeam: (data: Parameters<typeof updateTeam>[1]) => updateTeam(teamId, data),
    deleteTeam: () => deleteTeam(teamId),
    updateMemberRole: (memberId: string, role: Parameters<typeof updateMemberRole>[2]) =>
      updateMemberRole(teamId, memberId, role),
    removeMember: (memberId: string) => removeMember(teamId, memberId),
    leaveTeam: () => leaveTeam(teamId),
    clearError,
  };
}
