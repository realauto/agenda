import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { categories } from '../../constants/categories';
import type { UpdateCategory } from '../../types';

interface CategoryFilterProps {
  selected?: UpdateCategory;
  onChange: (category?: UpdateCategory) => void;
}

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <TouchableOpacity
        style={[styles.chip, !selected && styles.chipActive]}
        onPress={() => onChange(undefined)}
      >
        <Text style={[styles.chipText, !selected && styles.chipTextActive]}>All</Text>
      </TouchableOpacity>

      {categories.map((cat) => (
        <TouchableOpacity
          key={cat.value}
          style={[
            styles.chip,
            selected === cat.value && { backgroundColor: cat.color + '20', borderColor: cat.color },
          ]}
          onPress={() => onChange(selected === cat.value ? undefined : cat.value)}
        >
          <Feather
            name={cat.icon as any}
            size={14}
            color={selected === cat.value ? cat.color : colors.textSecondary}
            style={styles.chipIcon}
          />
          <Text
            style={[
              styles.chipText,
              selected === cat.value && { color: cat.color },
            ]}
          >
            {cat.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipIcon: {
    marginRight: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
  },
});
