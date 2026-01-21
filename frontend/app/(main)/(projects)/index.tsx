import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../../src/constants/colors';
import { ProjectCard } from '../../../src/components/project/ProjectCard';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { Loading } from '../../../src/components/ui/Loading';
import { projectsApi } from '../../../src/api/projects';
import { invitesApi } from '../../../src/api/invites';
import type { Project, ProjectInvite } from '../../../src/types';

type FilterType = 'all' | 'owned' | 'shared' | 'archived';

export default function ProjectsScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [pendingInvites, setPendingInvites] = useState<ProjectInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

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
    <View style={styles.inviteCard}>
      <View style={styles.inviteContent}>
        <Feather name="mail" size={20} color={colors.primary} />
        <View style={styles.inviteText}>
          <Text style={styles.inviteTitle}>
            Invited to {item.project?.name || 'a project'}
          </Text>
          <Text style={styles.inviteSubtitle}>
            as {item.role} {item.invitedByUser ? `by ${item.invitedByUser.displayName || item.invitedByUser.username}` : ''}
          </Text>
        </View>
      </View>
      <View style={styles.inviteActions}>
        <TouchableOpacity
          style={styles.declineButton}
          onPress={() => handleDeclineInvite(item.token)}
        >
          <Text style={styles.declineText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAcceptInvite(item.token)}
        >
          <Text style={styles.acceptText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {pendingInvites.length > 0 && (
        <View style={styles.invitesSection}>
          <Text style={styles.sectionTitle}>Pending Invites</Text>
          {pendingInvites.map((invite) => (
            <View key={invite._id}>
              {renderInvite({ item: invite })}
            </View>
          ))}
        </View>
      )}

      <View style={styles.filterRow}>
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
        <FilterButton
          label="Archived"
          active={filter === 'archived'}
          onPress={() => setFilter('archived')}
        />
      </View>
    </View>
  );

  if (isLoading && projects.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <Loading message="Loading projects..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <FlatList
        data={projects}
        renderItem={({ item }) => (
          <ProjectCard
            project={item}
            onPress={() => router.push(`/(main)/(projects)/${item._id}`)}
          />
        )}
        keyExtractor={(item) => item._id}
        contentContainerStyle={projects.length === 0 ? styles.emptyContainer : styles.list}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
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
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(main)/(projects)/new')}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function FilterButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.filterButton, active && styles.filterButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterText, active && styles.filterTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
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
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inviteCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
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
    color: colors.text,
  },
  inviteSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
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
    backgroundColor: colors.backgroundSecondary,
  },
  declineText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  acceptButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  acceptText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: '#fff',
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
