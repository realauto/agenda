import type { UpdateCategory, UpdateMood } from '../types';

export interface CategoryOption {
  value: UpdateCategory;
  label: string;
  icon: string;
  color: string;
}

export const categories: CategoryOption[] = [
  { value: 'progress', label: 'Progress', icon: 'trending-up', color: '#10B981' },
  { value: 'blocker', label: 'Blocker', icon: 'alert-circle', color: '#EF4444' },
  { value: 'bug', label: 'Bug', icon: 'bug', color: '#F97316' },
  { value: 'feature', label: 'Feature', icon: 'star', color: '#8B5CF6' },
  { value: 'milestone', label: 'Milestone', icon: 'flag', color: '#F59E0B' },
  { value: 'general', label: 'General', icon: 'message-circle', color: '#6B7280' },
];

export interface MoodOption {
  value: UpdateMood;
  label: string;
  icon: string;
  color: string;
}

export const moods: MoodOption[] = [
  { value: 'positive', label: 'Positive', icon: 'smile', color: '#10B981' },
  { value: 'neutral', label: 'Neutral', icon: 'meh', color: '#6B7280' },
  { value: 'negative', label: 'Negative', icon: 'frown', color: '#EF4444' },
  { value: 'urgent', label: 'Urgent', icon: 'alert-triangle', color: '#F59E0B' },
];

export const getCategoryByValue = (value: UpdateCategory): CategoryOption | undefined => {
  return categories.find((c) => c.value === value);
};

export const getMoodByValue = (value: UpdateMood): MoodOption | undefined => {
  return moods.find((m) => m.value === value);
};
