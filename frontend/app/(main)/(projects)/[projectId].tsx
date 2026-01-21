import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../../src/constants/colors';
import { Card } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { Loading } from '../../../src/components/ui/Loading';
import { FeedList } from '../../../src/components/feed/FeedList';
import { CategoryFilter } from '../../../src/components/feed/CategoryFilter';
import { useProject } from '../../../src/hooks/useProject';
import { useProjectFeed } from '../../../src/hooks/useFeed';

const statusColors: Record<string, string> = {
  active: colors.success,
  paused: colors.warning,
  completed: colors.primary,
  archived: colors.textMuted,
};

export default function ProjectDetailScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const { project, isLoading: projectLoading } = useProject(projectId);
  const {
    updates,
    hasMore,
    isLoading,
    isRefreshing,
    categoryFilter,
    loadMore,
    refresh,
    addReaction,
    removeReaction,
    deleteUpdate,
    setCategoryFilter,
  } = useProjectFeed(projectId);

  if (projectLoading || !project) {
    return (
      <SafeAreaView style={styles.container}>
        <Loading message="Loading project..." />
      </SafeAreaView>
    );
  }

  const handleReact = async (updateId: string, emoji: string) => {
    const update = updates.find((u) => u._id === updateId);
    if (!update) return;

    const existingReaction = update.reactions.find(
      (r) => r.emoji === emoji
    );

    if (existingReaction) {
      await removeReaction(updateId, emoji);
    } else {
      await addReaction(updateId, emoji);
    }
  };

  const handleDelete = async (updateId: string) => {
    Alert.alert('Delete Update', 'Are you sure you want to delete this update?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteUpdate(updateId),
      },
    ]);
  };

  const ProjectHeader = () => (
    <View>
      <Card style={styles.projectHeader}>
        <View style={styles.headerTop}>
          {project.color && (
            <View style={[styles.colorDot, { backgroundColor: project.color }]} />
          )}
          <Text style={styles.projectName}>{project.name}</Text>
          <Badge
            label={project.status}
            color={statusColors[project.status]}
            size="medium"
          />
        </View>

        {project.description && (
          <Text style={styles.projectDescription}>{project.description}</Text>
        )}

        {project.tags && project.tags.length > 0 && (
          <View style={styles.tags}>
            {project.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.projectStats}>
          <View style={styles.stat}>
            <Feather name="message-circle" size={16} color={colors.textMuted} />
            <Text style={styles.statText}>{project.stats.totalUpdates} updates</Text>
          </View>
        </View>
      </Card>

      <CategoryFilter selected={categoryFilter} onChange={setCategoryFilter} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <FeedList
        updates={updates}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        hasMore={hasMore}
        onRefresh={refresh}
        onLoadMore={loadMore}
        onReact={handleReact}
        onDelete={handleDelete}
        emptyTitle="No updates yet"
        emptyMessage="Post the first update for this project"
        emptyAction="Post Update"
        onEmptyAction={() => router.push(`/(main)/(feed)/new?projectId=${projectId}`)}
        ListHeaderComponent={<ProjectHeader />}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push(`/(main)/(feed)/new?projectId=${projectId}`)}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  projectHeader: {
    margin: 16,
    marginBottom: 0,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  projectName: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginRight: 8,
  },
  projectDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  projectStats: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    color: colors.textMuted,
    marginLeft: 6,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
