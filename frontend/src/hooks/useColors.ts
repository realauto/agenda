import { useUIStore } from '../store/uiStore';
import { colors as baseColors } from '../constants/colors';

export function useColors() {
  const isDarkMode = useUIStore((state) => state.isDarkMode);

  if (isDarkMode) {
    return {
      ...baseColors,
      background: baseColors.dark.background,
      backgroundSecondary: baseColors.dark.backgroundSecondary,
      surface: baseColors.dark.surface,
      text: baseColors.dark.text,
      textSecondary: baseColors.dark.textSecondary,
      textMuted: baseColors.dark.textMuted,
      border: baseColors.dark.border,
      borderLight: baseColors.dark.borderLight,
    };
  }

  return baseColors;
}
