import { create } from 'zustand';
import { getDarkMode, setDarkMode as persistDarkMode } from '../lib/storage';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface UIState {
  isDarkMode: boolean;
  toasts: Toast[];

  // Actions
  toggleDarkMode: () => void;
  setDarkMode: (isDark: boolean) => void;
  showToast: (message: string, type?: Toast['type']) => void;
  dismissToast: (id: string) => void;
  initializeDarkMode: () => Promise<void>;
}

let toastId = 0;

export const useUIStore = create<UIState>((set) => ({
  isDarkMode: false,
  toasts: [],

  toggleDarkMode: () =>
    set((state) => {
      const newValue = !state.isDarkMode;
      persistDarkMode(newValue);
      return { isDarkMode: newValue };
    }),

  setDarkMode: (isDark: boolean) => {
    persistDarkMode(isDark);
    set({ isDarkMode: isDark });
  },

  showToast: (message: string, type: Toast['type'] = 'info') => {
    const id = `toast-${++toastId}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));

    // Auto dismiss after 3 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3000);
  },

  dismissToast: (id: string) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  initializeDarkMode: async () => {
    const isDark = await getDarkMode();
    set({ isDarkMode: isDark });
  },
}));

// Initialize dark mode from storage on app load
getDarkMode().then((isDark) => {
  useUIStore.getState().setDarkMode(isDark);
});
