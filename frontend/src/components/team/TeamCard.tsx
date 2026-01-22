import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import type { Team } from '../../types';

interface TeamCardProps {
  team: Team;
  onPress: () => void;
}

export function TeamCard({ team, onPress }: TeamCardProps) {
  const colors = useColors();

  return (
    <Card style={styles.card} onPress={onPress}>
      <View style={styles.content}>
        <Avatar source={team.avatar} name={team.name} size="large" />
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]}>{team.name}</Text>
          {team.description && (
            <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
              {team.description}
            </Text>
          )}
          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <Feather name="users" size={14} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>{team.members.length} members</Text>
            </View>
          </View>
        </View>
        <Feather name="chevron-right" size={20} color={colors.textMuted} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    marginBottom: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    marginLeft: 4,
  },
});
