import { create } from 'zustand';
import type { Update, UpdateCategory } from '../types';
import { updatesApi, type CreateUpdateInput, type UpdateUpdateInput } from '../api/updates';
import { config } from '../constants/config';

interface FeedState {
  updates: Update[];
  hasMore: boolean;
  nextCursor?: string;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  categoryFilter?: UpdateCategory;

  // Actions
  fetchFeed: (reset?: boolean) => Promise<void>;
  fetchTeamFeed: (teamId: string, reset?: boolean) => Promise<void>;
  fetchProjectFeed: (projectId: string, reset?: boolean) => Promise<void>;
  createUpdate: (data: CreateUpdateInput) => Promise<Update>;
  editUpdate: (updateId: string, data: UpdateUpdateInput) => Promise<void>;
  deleteUpdate: (updateId: string) => Promise<void>;
  addReaction: (updateId: string, emoji: string) => Promise<void>;
  removeReaction: (updateId: string, emoji: string) => Promise<void>;
  setCategoryFilter: (category?: UpdateCategory) => void;
  clearFeed: () => void;
  clearError: () => void;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  updates: [],
  hasMore: true,
  nextCursor: undefined,
  isLoading: false,
  isRefreshing: false,
  error: null,
  categoryFilter: undefined,

  fetchFeed: async (reset = false) => {
    const { isLoading, nextCursor, categoryFilter, hasMore } = get();
    if (isLoading || (!reset && !hasMore)) return;

    set({
      isLoading: true,
      isRefreshing: reset,
      error: null,
    });

    try {
      const response = await updatesApi.getFeed({
        cursor: reset ? undefined : nextCursor,
        limit: config.feedPageSize,
        category: categoryFilter,
      });

      set((state) => ({
        updates: reset ? response.updates : [...state.updates, ...response.updates],
        hasMore: response.hasMore,
        nextCursor: response.nextCursor,
        isLoading: false,
        isRefreshing: false,
      }));
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch feed';
      set({ error: message, isLoading: false, isRefreshing: false, hasMore: false });
    }
  },

  fetchTeamFeed: async (teamId: string, reset = false) => {
    const { isLoading, nextCursor, categoryFilter, hasMore } = get();
    if (isLoading || (!reset && !hasMore)) return;

    set({
      isLoading: true,
      isRefreshing: reset,
      error: null,
    });

    try {
      const response = await updatesApi.getTeamFeed(teamId, {
        cursor: reset ? undefined : nextCursor,
        limit: config.feedPageSize,
        category: categoryFilter,
      });

      set((state) => ({
        updates: reset ? response.updates : [...state.updates, ...response.updates],
        hasMore: response.hasMore,
        nextCursor: response.nextCursor,
        isLoading: false,
        isRefreshing: false,
      }));
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch team feed';
      set({ error: message, isLoading: false, isRefreshing: false, hasMore: false });
    }
  },

  fetchProjectFeed: async (projectId: string, reset = false) => {
    const { isLoading, nextCursor, categoryFilter, hasMore } = get();
    if (isLoading || (!reset && !hasMore)) return;

    set({
      isLoading: true,
      isRefreshing: reset,
      error: null,
    });

    try {
      const response = await updatesApi.getProjectFeed(projectId, {
        cursor: reset ? undefined : nextCursor,
        limit: config.feedPageSize,
        category: categoryFilter,
      });

      set((state) => ({
        updates: reset ? response.updates : [...state.updates, ...response.updates],
        hasMore: response.hasMore,
        nextCursor: response.nextCursor,
        isLoading: false,
        isRefreshing: false,
      }));
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch project feed';
      set({ error: message, isLoading: false, isRefreshing: false, hasMore: false });
    }
  },

  createUpdate: async (data: CreateUpdateInput) => {
    try {
      const response = await updatesApi.create(data);
      set((state) => ({
        updates: [response.update, ...state.updates],
      }));
      return response.update;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create update';
      set({ error: message });
      throw new Error(message);
    }
  },

  editUpdate: async (updateId: string, data: UpdateUpdateInput) => {
    try {
      const response = await updatesApi.update(updateId, data);
      set((state) => ({
        updates: state.updates.map((u) =>
          u._id === updateId ? response.update : u
        ),
      }));
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to edit update';
      set({ error: message });
      throw new Error(message);
    }
  },

  deleteUpdate: async (updateId: string) => {
    try {
      await updatesApi.delete(updateId);
      set((state) => ({
        updates: state.updates.filter((u) => u._id !== updateId),
      }));
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete update';
      set({ error: message });
      throw new Error(message);
    }
  },

  addReaction: async (updateId: string, emoji: string) => {
    try {
      const response = await updatesApi.addReaction(updateId, emoji);
      set((state) => ({
        updates: state.updates.map((u) =>
          u._id === updateId ? response.update : u
        ),
      }));
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to add reaction';
      set({ error: message });
    }
  },

  removeReaction: async (updateId: string, emoji: string) => {
    try {
      const response = await updatesApi.removeReaction(updateId, emoji);
      set((state) => ({
        updates: state.updates.map((u) =>
          u._id === updateId ? response.update : u
        ),
      }));
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to remove reaction';
      set({ error: message });
    }
  },

  setCategoryFilter: (category?: UpdateCategory) => {
    set({ categoryFilter: category, updates: [], hasMore: true, nextCursor: undefined });
  },

  clearFeed: () => {
    set({
      updates: [],
      hasMore: true,
      nextCursor: undefined,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));
