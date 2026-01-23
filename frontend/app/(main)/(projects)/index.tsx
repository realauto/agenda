import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '../../../src/hooks/useColors';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { Loading } from '../../../src/components/ui/Loading';
import { projectsApi } from '../../../src/api/projects';
import { invitesApi } from '../../../src/api/invites';
import type { Project, ProjectInvite } from '../../../src/types';

type FilterType = 'all' | 'owned' | 'shared' | 'archived';
type ViewMode = 'list' | 'card';

// Helper function to format relative date
function formatRelativeDate(dateString?: string): string {
  if (!dateString) return '-';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
}

// Helper function to truncate text
function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text || '';
  return text.slice(0, maxLength) + '...';
}

export default function ProjectsScreen() {
  const colors = useColors();
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingInvites, setPendingInvites] = useState<ProjectInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('card');

  // Helper function to get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return colors.success;
      case 'paused': return colors.warning;
      case 'completed': return colors.primary;
      case 'archived': return colors.textMuted;
      default: return colors.textSecondary;
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [filter])
  );

  const loadData = async () => {
    try {
      // For archived filter, get all projects then filter client-side
      // For other filters, use the API filter but exclude archived on client side
      const apiFilter = filter === 'archived' ? 'all' : filter;
      const [projectsResponse, invitesResponse] = await Promise.all([
        projectsApi.getAll(apiFilter),
        invitesApi.getPending(),
      ]);

      // Filter projects based on archive status
      let filteredProjects = projectsResponse.projects;
      if (filter === 'archived') {
        // Show only archived projects
        filteredProjects = filteredProjects.filter((p) => p.status === 'archived');
      } else {
        // Hide archived projects for all other filters
        filteredProjects = filteredProjects.filter((p) => p.status !== 'archived');
      }

      setProjects(filteredProjects);
      setPendingInvites(invitesResponse.invites);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleAcceptInvite = async (token: string) => {
    try {
      await invitesApi.accept(token);
      loadData();
    } catch (error) {
      console.error('Failed to accept invite:', error);
    }
  };

  const handleDeclineInvite = async (token: string) => {
    try {
      await invitesApi.decline(token);
      setPendingInvites((prev) => prev.filter((inv) => inv.token !== token));
    } catch (error) {
      console.error('Failed to decline invite:', error);
    }
  };

  const renderInvite = ({ item }: { item: ProjectInvite }) => (
    <View style={[styles.inviteCard, { backgroundColor: colors.background, borderLeftColor: colors.primary }]}>
      <View style={styles.inviteContent}>
        <Feather name="mail" size={20} color={colors.primary} />
        <View style={styles.inviteText}>
          <Text style={[styles.inviteTitle, { color: colors.text }]}>
            Invited to {item.project?.name || 'a project'}
          </Text>
          <Text style={[styles.inviteSubtitle, { color: colors.textSecondary }]}>
            as {item.role} {item.invitedByUser ? `by ${item.invitedByUser.displayName || item.invitedByUser.username}` : ''}
          </Text>
        </View>
      </View>
      <View style={styles.inviteActions}>
        <TouchableOpacity
          style={[styles.declineButton, { backgroundColor: colors.backgroundSecondary }]}
          onPress={() => handleDeclineInvite(item.token)}
        >
          <Text style={[styles.declineText, { color: colors.textSecondary }]}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.acceptButton, { backgroundColor: colors.primary }]}
          onPress={() => handleAcceptInvite(item.token)}
        >
          <Text style={styles.acceptText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const FilterButton = ({
    label,
    active,
    onPress,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) => (
    <Pressable
      style={[
        styles.filterButton,
        { backgroundColor: active ? colors.primary : colors.background },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.filterText, { color: active ? '#fff' : colors.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {pendingInvites.length > 0 && (
        <View style={styles.invitesSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Pending Invites</Text>
          {pendingInvites.map((invite) => (
            <View key={invite._id}>
              {renderInvite({ item: invite })}
            </View>
          ))}
        </View>
      )}

      <View style={styles.filterRow}>
        <View style={styles.filterButtons}>
          <FilterButton
            label="All"
            active={filter === 'all'}
            onPress={() => setFilter('all')}
          />
          <FilterButton
            label="My Projects"
            active={filter === 'owned'}
            onPress={() => setFilter('owned')}
          />
          <FilterButton
            label="Shared"
            active={filter === 'shared'}
            onPress={() => setFilter('shared')}
          />
          <TouchableOpacity
            style={[
              styles.iconFilterButton,
              { backgroundColor: filter === 'archived' ? colors.primary : colors.background },
            ]}
            onPress={() => setFilter('archived')}
          >
            <Feather name="archive" size={16} color={filter === 'archived' ? '#fff' : colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[
              styles.viewToggleButton,
              { backgroundColor: viewMode === 'card' ? colors.primary : colors.background },
            ]}
            onPress={() => setViewMode('card')}
          >
            <Feather name="grid" size={18} color={viewMode === 'card' ? '#fff' : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewToggleButton,
              { backgroundColor: viewMode === 'list' ? colors.primary : colors.background },
            ]}
            onPress={() => setViewMode('list')}
          >
            <Feather name="list" size={18} color={viewMode === 'list' ? '#fff' : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (isLoading && projects.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]} edges={['left', 'right']}>
        <Loading message="Loading projects..." />
      </SafeAreaView>
    );
  }

  const renderTable = () => (
    <View style={[styles.tableContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
      {/* Table Header */}
      <View style={[styles.tableHeader, { backgroundColor: colors.backgroundSecondary, borderBottomColor: colors.border }]}>
        <View style={[styles.tableCell, styles.colorCell]}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}></Text>
        </View>
        <View style={[styles.tableCell, styles.nameCell]}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>Name</Text>
        </View>
        <View style={[styles.tableCell, styles.descriptionCell]}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>Description</Text>
        </View>
        <View style={[styles.tableCell, styles.statusCell]}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>Status</Text>
        </View>
        <View style={[styles.tableCell, styles.updatesCell]}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>Updates</Text>
        </View>
        <View style={[styles.tableCell, styles.lastUpdatedCell]}>
          <Text style={[styles.headerText, { color: colors.textSecondary }]}>Last Updated</Text>
        </View>
      </View>

      {/* Table Body */}
      {projects.map((project, index) => (
        <Pressable
          key={project._id}
          style={({ pressed }) => [
            styles.tableRow,
            { backgroundColor: colors.background, borderBottomColor: colors.border },
            index % 2 === 1 && { backgroundColor: colors.backgroundSecondary },
            pressed && { backgroundColor: colors.borderLight },
          ]}
          onPress={() => router.push(`/(main)/(projects)/${project._id}`)}
        >
          <View style={[styles.tableCell, styles.colorCell]}>
            <View
              style={[
                styles.colorDot,
                { backgroundColor: project.color || colors.primary },
              ]}
            />
          </View>
          <View style={[styles.tableCell, styles.nameCell]}>
            <Text style={[styles.projectName, { color: colors.text }]} numberOfLines={1}>
              {project.name}
            </Text>
          </View>
          <View style={[styles.tableCell, styles.descriptionCell]}>
            <Text style={[styles.cellText, { color: colors.textSecondary }]} numberOfLines={1}>
              {truncateText(project.description || '', 40)}
            </Text>
          </View>
          <View style={[styles.tableCell, styles.statusCell]}>
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(project.status) },
              ]}
            >
              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </Text>
          </View>
          <View style={[styles.tableCell, styles.updatesCell]}>
            <Text style={[styles.cellText, { color: colors.textSecondary }]}>{project.stats?.totalUpdates || 0}</Text>
          </View>
          <View style={[styles.tableCell, styles.lastUpdatedCell]}>
            <Text style={[styles.cellText, { color: colors.textSecondary }]}>
              {formatRelativeDate(project.updatedAt)}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );

  const renderCards = () => (
    <View style={styles.cardsContainer}>
      {projects.map((project) => (
        <Pressable
          key={project._id}
          style={({ pressed }) => [
            styles.projectCard,
            { backgroundColor: colors.background, borderColor: colors.border },
            pressed && { backgroundColor: colors.borderLight },
          ]}
          onPress={() => router.push(`/(main)/(projects)/${project._id}`)}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <View
                style={[
                  styles.cardColorDot,
                  { backgroundColor: project.color || colors.primary },
                ]}
              />
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                {project.name}
              </Text>
            </View>
            <Text
              style={[
                styles.cardStatus,
                { color: getStatusColor(project.status) },
              ]}
            >
              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </Text>
          </View>

          {project.latestUpdate ? (
            <View style={[styles.latestUpdateBox, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.latestUpdateContent, { color: colors.text }]} numberOfLines={2}>
                {project.latestUpdate.content}
              </Text>
              <View style={styles.latestUpdateMeta}>
                <Text style={[styles.latestUpdateAuthor, { color: colors.textSecondary }]}>
                  {project.latestUpdate.author?.displayName || project.latestUpdate.author?.username || 'Unknown'}
                </Text>
                <Text style={[styles.latestUpdateTime, { color: colors.textMuted }]}>
                  {' · '}{formatRelativeDate(project.latestUpdate.createdAt)}
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.latestUpdateBox, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.noUpdatesText, { color: colors.textMuted }]}>
                No updates yet
              </Text>
            </View>
          )}

          <View style={styles.cardFooter}>
            <View style={styles.cardStat}>
              <Feather name="message-square" size={14} color={colors.textMuted} />
              <Text style={[styles.cardStatText, { color: colors.textMuted }]}>
                {project.stats?.totalUpdates || 0}
              </Text>
            </View>
            <Text style={[styles.cardTime, { color: colors.textMuted }]}>
              {formatRelativeDate(project.updatedAt)}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={projects.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {renderHeader()}

        {projects.length === 0 ? (
          <EmptyState
            icon={filter === 'archived' ? 'archive' : 'folder'}
            title={filter === 'archived' ? 'No archived projects' : 'No projects yet'}
            message={
              filter === 'all'
                ? 'Create your first project to start tracking progress'
                : filter === 'owned'
                ? 'You haven\'t created any projects yet'
                : filter === 'shared'
                ? 'No projects have been shared with you'
                : 'Projects you archive will appear here'
            }
            actionLabel={filter !== 'shared' && filter !== 'archived' ? 'Create Project' : undefined}
            onAction={filter !== 'shared' && filter !== 'archived' ? () => router.push('/(main)/(projects)/new') : undefined}
          />
        ) : viewMode === 'card' ? (
          renderCards()
        ) : (
          renderTable()
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/(main)/(projects)/new')}
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
  },
  scrollView: {
    flex: 1,
  },
  list: {
    paddingBottom: 80,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  invitesSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inviteCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  inviteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inviteText: {
    marginLeft: 12,
    flex: 1,
  },
  inviteTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  inviteSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  inviteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  declineButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  declineText: {
    fontSize: 14,
    fontWeight: '500',
  },
  acceptButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  iconFilterButton: {
    padding: 8,
    borderRadius: 20,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
  },
  viewToggleButton: {
    padding: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  // Table styles
  tableContainer: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    marginHorizontal: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tableCell: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  colorCell: {
    width: 44,
    alignItems: 'center',
  },
  nameCell: {
    flex: 2,
    minWidth: 120,
  },
  descriptionCell: {
    flex: 3,
    minWidth: 150,
  },
  statusCell: {
    width: 80,
  },
  updatesCell: {
    width: 70,
    alignItems: 'center',
  },
  lastUpdatedCell: {
    width: 100,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cellText: {
    fontSize: 14,
  },
  projectName: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  // Card view styles
  cardsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  projectCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  cardColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  cardStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  latestUpdateBox: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  latestUpdateContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  latestUpdateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  latestUpdateAuthor: {
    fontSize: 13,
    fontWeight: '500',
  },
  latestUpdateTime: {
    fontSize: 13,
  },
  noUpdatesText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardStatText: {
    fontSize: 13,
  },
  cardTime: {
    fontSize: 13,
  },
});
