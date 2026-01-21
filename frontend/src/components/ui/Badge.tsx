import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

interface BadgeProps {
  label: string;
  color?: string;
  textColor?: string;
  size?: 'small' | 'medium';
  style?: ViewStyle;
}

export function Badge({
  label,
  color = '#6B7280',
  textColor = '#fff',
  size = 'small',
  style,
}: BadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        size === 'medium' && styles.mediumBadge,
        { backgroundColor: color },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          size === 'medium' && styles.mediumText,
          { color: textColor },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  mediumBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  mediumText: {
    fontSize: 13,
  },
});
