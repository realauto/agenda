import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../../src/constants/colors';
import { ProjectCard } from '../../../src/components/project/ProjectCard';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { Loading } from '../../../src/components/ui/Loading';
import { useTeamStore } from '../../../src/store/teamStore';
import { projectsApi } from '../../../src/api/projects';
import type { Project } from '../../../src/types';

export default function ProjectsScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { teams, fetchTeams } = useTeamStore();

  useEffect(() => {
    loadProjects();
  }, [teams]);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      await fetchTeams();
      const allProjects: Project[] = [];
      for (const team of teams) {
        const response = await projectsApi.getByTeam(team._id);
        allProjects.push(...response.projects);
      }
      // Sort by last update
      allProjects.sort((a, b) => {
        const dateA = a.stats.lastUpdateAt || a.createdAt;
        const dateB = b.stats.lastUpdateAt || b.createdAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
      setProjects(allProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadProjects();
    setIsRefreshing(false);
  };

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
            icon="folder"
            title="No projects yet"
            message="Create a project to start tracking progress"
            actionLabel="Create Project"
            onAction={() => router.push('/(main)/(projects)/new')}
          />
        }
      />

      {projects.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/(main)/(projects)/new')}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  list: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flexGrow: 1,
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
