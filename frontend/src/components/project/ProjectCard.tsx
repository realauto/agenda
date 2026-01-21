import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { Project } from '../../types';

interface ProjectCardProps {
  project: Project;
  onPress: () => void;
}

const statusColors: Record<string, string> = {
  active: colors.success,
  paused: colors.warning,
  completed: colors.primary,
  archived: colors.textMuted,
};

function formatLastUpdate(dateString?: string): string {
  if (!dateString) return 'No updates';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'Updated today';
  if (diffDays === 1) return 'Updated yesterday';
  if (diffDays < 7) return `Updated ${diffDays}d ago`;

  return `Updated ${date.toLocaleDateString()}`;
}

export function ProjectCard({ project, onPress }: ProjectCardProps) {
  return (
    <Card style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        {project.color && (
          <View style={[styles.colorDot, { backgroundColor: project.color }]} />
        )}
        <Text style={styles.name} numberOfLines={1}>
          {project.name}
        </Text>
        <Badge
          label={project.status}
          color={statusColors[project.status]}
          size="small"
        />
      </View>

      {project.description && (
        <Text style={styles.description} numberOfLines={2}>
          {project.description}
        </Text>
      )}

      {project.tags && project.tags.length > 0 && (
        <View style={styles.tags}>
          {project.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          {project.tags.length > 3 && (
            <Text style={styles.moreTagsText}>+{project.tags.length - 3}</Text>
          )}
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.stat}>
          <Feather name="message-circle" size={14} color={colors.textMuted} />
          <Text style={styles.statText}>{project.stats.totalUpdates} updates</Text>
        </View>
        <Text style={styles.lastUpdate}>
          {formatLastUpdate(project.stats.lastUpdateAt)}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginRight: 8,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  moreTagsText: {
    fontSize: 12,
    color: colors.textMuted,
    alignSelf: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 13,
    color: colors.textMuted,
    marginLeft: 4,
  },
  lastUpdate: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
