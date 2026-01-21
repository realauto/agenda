import { useEffect, useCallback } from 'react';
import { useFeedStore } from '../store/feedStore';
import type { UpdateCategory } from '../types';

export function useFeed() {
  const {
    updates,
    hasMore,
    isLoading,
    isRefreshing,
    error,
    categoryFilter,
    fetchFeed,
    createUpdate,
    editUpdate,
    deleteUpdate,
    addReaction,
    removeReaction,
    setCategoryFilter,
    clearFeed,
    clearError,
  } = useFeedStore();

  useEffect(() => {
    fetchFeed(true);
  }, [categoryFilter]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      fetchFeed(false);
    }
  }, [hasMore, isLoading, fetchFeed]);

  const refresh = useCallback(() => {
    fetchFeed(true);
  }, [fetchFeed]);

  return {
    updates,
    hasMore,
    isLoading,
    isRefreshing,
    error,
    categoryFilter,
    loadMore,
    refresh,
    createUpdate,
    editUpdate,
    deleteUpdate,
    addReaction,
    removeReaction,
    setCategoryFilter,
    clearFeed,
    clearError,
  };
}

export function useTeamFeed(teamId: string) {
  const {
    updates,
    hasMore,
    isLoading,
    isRefreshing,
    error,
    categoryFilter,
    fetchTeamFeed,
    createUpdate,
    editUpdate,
    deleteUpdate,
    addReaction,
    removeReaction,
    setCategoryFilter,
    clearError,
  } = useFeedStore();

  useEffect(() => {
    if (teamId) {
      fetchTeamFeed(teamId, true);
    }
  }, [teamId, categoryFilter]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading && teamId) {
      fetchTeamFeed(teamId, false);
    }
  }, [hasMore, isLoading, teamId, fetchTeamFeed]);

  const refresh = useCallback(() => {
    if (teamId) {
      fetchTeamFeed(teamId, true);
    }
  }, [teamId, fetchTeamFeed]);

  return {
    updates,
    hasMore,
    isLoading,
    isRefreshing,
    error,
    categoryFilter,
    loadMore,
    refresh,
    createUpdate,
    editUpdate,
    deleteUpdate,
    addReaction,
    removeReaction,
    setCategoryFilter,
    clearError,
  };
}

export function useProjectFeed(projectId: string) {
  const {
    updates,
    hasMore,
    isLoading,
    isRefreshing,
    error,
    categoryFilter,
    fetchProjectFeed,
    createUpdate,
    editUpdate,
    deleteUpdate,
    addReaction,
    removeReaction,
    setCategoryFilter,
    clearError,
  } = useFeedStore();

  useEffect(() => {
    if (projectId) {
      fetchProjectFeed(projectId, true);
    }
  }, [projectId, categoryFilter]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading && projectId) {
      fetchProjectFeed(projectId, false);
    }
  }, [hasMore, isLoading, projectId, fetchProjectFeed]);

  const refresh = useCallback(() => {
    if (projectId) {
      fetchProjectFeed(projectId, true);
    }
  }, [projectId, fetchProjectFeed]);

  return {
    updates,
    hasMore,
    isLoading,
    isRefreshing,
    error,
    categoryFilter,
    loadMore,
    refresh,
    createUpdate,
    editUpdate,
    deleteUpdate,
    addReaction,
    removeReaction,
    setCategoryFilter,
    clearError,
  };
}
