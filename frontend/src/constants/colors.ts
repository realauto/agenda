export const colors = {
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  primaryLight: '#60A5FA',

  secondary: '#8B5CF6',
  secondaryDark: '#7C3AED',
  secondaryLight: '#A78BFA',

  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  background: '#FFFFFF',
  backgroundSecondary: '#F3F4F6',
  surface: '#FFFFFF',

  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',

  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  // Dark mode colors
  dark: {
    background: '#111827',
    backgroundSecondary: '#1F2937',
    surface: '#1F2937',
    text: '#F9FAFB',
    textSecondary: '#D1D5DB',
    textMuted: '#9CA3AF',
    border: '#374151',
    borderLight: '#1F2937',
  },
};

// Category colors
export const categoryColors: Record<string, string> = {
  progress: '#10B981',
  blocker: '#EF4444',
  bug: '#F97316',
  feature: '#8B5CF6',
  milestone: '#F59E0B',
  general: '#6B7280',
};

// Mood colors
export const moodColors: Record<string, string> = {
  positive: '#10B981',
  neutral: '#6B7280',
  negative: '#EF4444',
  urgent: '#F59E0B',
};
