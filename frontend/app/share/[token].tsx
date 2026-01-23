import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '../../src/hooks/useColors';
import { publicApi } from '../../src/api/projects';
import type { Project, Update } from '../../src/types';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function PublicProjectView() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const colors = useColors();
  const [project, setProject] = useState<Project | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    try {
      setError(null);
      const [projectRes, feedRes] = await Promise.all([
        publicApi.getProject(token!),
        publicApi.getProjectFeed(token!),
      ]);
      setProject(projectRes.project);
      setUpdates(feedRes.updates);
      setHasMore(feedRes.hasMore);
      setNextCursor(feedRes.nextCursor);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return colors.success;
      case 'paused': return colors.warning;
      case 'completed': return colors.primary;
      case 'archived': return colors.textMuted;
      default: return colors.textSecondary;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading project...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !project) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={styles.centered}>
          <Feather name="alert-circle" size={48} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>Project Not Found</Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
            {error || 'This link may be invalid or the project is no longer shared publicly.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Public Badge */}
        <View style={[styles.publicBadge, { backgroundColor: colors.primary }]}>
          <Feather name="globe" size={14} color="#fff" />
          <Text style={styles.publicBadgeText}>Public View</Text>
        </View>

        {/* Project Header */}
        <View style={[styles.projectHeader, { backgroundColor: colors.background }]}>
          <View style={styles.titleRow}>
            <View style={[styles.colorDot, { backgroundColor: project.color || colors.primary }]} />
            <Text style={[styles.projectName, { color: colors.text }]}>{project.name}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(project.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(project.status) }]}>
              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </Text>
          </View>
          {project.description && (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {project.description}
            </Text>
          )}
          {project.tags && project.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {project.tags.map((tag, index) => (
                <View key={index} style={[styles.tag, { backgroundColor: colors.backgroundSecondary }]}>
                  <Text style={[styles.tagText, { color: colors.textSecondary }]}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Feather name="message-square" size={16} color={colors.textMuted} />
              <Text style={[styles.statText, { color: colors.textMuted }]}>
                {project.stats?.totalUpdates || 0} updates
              </Text>
            </View>
          </View>
        </View>

        {/* Updates Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Updates</Text>

        {updates.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
            <Feather name="inbox" size={32} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No updates yet</Text>
          </View>
        ) : (
          updates.map((update) => (
            <View key={update._id} style={[styles.updateCard, { backgroundColor: colors.background }]}>
              <View style={styles.updateHeader}>
                <Text style={[styles.authorName, { color: colors.text }]}>
                  {update.author?.displayName || update.author?.username || 'Unknown'}
                </Text>
                <Text style={[styles.updateTime, { color: colors.textMuted }]}>
                  {formatRelativeTime(update.createdAt)}
                </Text>
              </View>
              <Text style={[styles.updateContent, { color: colors.text }]}>{update.content}</Text>
              {update.reactions && update.reactions.length > 0 && (
                <View style={styles.reactionsRow}>
                  {update.reactions.slice(0, 5).map((reaction, idx) => (
                    <Text key={idx} style={styles.reactionEmoji}>{reaction.emoji}</Text>
                  ))}
                </View>
              )}
            </View>
          ))
        )}

        {/* Sign up prompt */}
        <View style={[styles.signupPrompt, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Feather name="user-plus" size={24} color={colors.primary} />
          <Text style={[styles.signupText, { color: colors.text }]}>
            Want to collaborate on this project?
          </Text>
          <Text style={[styles.signupSubtext, { color: colors.textSecondary }]}>
            Sign up to comment, react, and post updates.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
    gap: 6,
  },
  publicBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  projectHeader: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  titleRow: {
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
  projectName: {
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  emptyState: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
  },
  updateCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  updateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
  },
  updateTime: {
    fontSize: 13,
  },
  updateContent: {
    fontSize: 15,
    lineHeight: 22,
  },
  reactionsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 4,
  },
  reactionEmoji: {
    fontSize: 18,
  },
  signupPrompt: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 24,
    borderWidth: 1,
  },
  signupText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  signupSubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
});
