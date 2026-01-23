import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '../../../src/hooks/useColors';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { Loading } from '../../../src/components/ui/Loading';
import { Avatar } from '../../../src/components/ui/Avatar';
import { usersApi } from '../../../src/api/users';
import { projectsApi } from '../../../src/api/projects';
import type { UserConnection, User, Project } from '../../../src/types';

export default function MembersScreen() {
  const colors = useColors();
  const [connections, setConnections] = useState<UserConnection[]>([]);
  const [filteredConnections, setFilteredConnections] = useState<UserConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state for viewing shared projects
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [sharedProjects, setSharedProjects] = useState<Project[]>([]);
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadConnections();
    }, [])
  );

  const loadConnections = async () => {
    try {
      const response = await usersApi.getConnections();
      setConnections(response.connections);
      setFilteredConnections(response.connections);
    } catch (error) {
      console.error('Failed to load connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadConnections();
    setIsRefreshing(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredConnections(connections);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = connections.filter((conn) => {
      const name = conn.user.displayName || conn.user.username;
      return (
        name.toLowerCase().includes(lowerQuery) ||
        conn.user.username.toLowerCase().includes(lowerQuery) ||
        conn.user.email.toLowerCase().includes(lowerQuery)
      );
    });
    setFilteredConnections(filtered);
  };

  const handleViewSharedProjects = async (user: User) => {
    setSelectedUser(user);
    setShowProjectsModal(true);
    setIsLoadingProjects(true);

    try {
      // Get all projects and filter to find shared ones
      const response = await projectsApi.getAll();
      const shared = response.projects.filter((project) => {
        // Check if this user is the owner or a collaborator
        if (project.ownerId === user._id) return true;
        return project.collaborators?.some((c) => c.userId === user._id);
      });
      setSharedProjects(shared);
    } catch (error) {
      console.error('Failed to load shared projects:', error);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]} edges={['left', 'right']}>
        <Loading message="Loading members..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={filteredConnections.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Feather name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search members..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={handleSearch}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <Feather name="x" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {filteredConnections.length === 0 ? (
          <EmptyState
            icon="users"
            title={searchQuery ? 'No members found' : 'No connections yet'}
            message={
              searchQuery
                ? 'Try a different search term'
                : 'People you collaborate with on projects will appear here'
            }
          />
        ) : (
          <View style={styles.membersList}>
            {filteredConnections.map((connection) => (
              <TouchableOpacity
                key={connection.user._id}
                style={[styles.memberCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => handleViewSharedProjects(connection.user)}
                activeOpacity={0.7}
              >
                <Avatar
                  uri={connection.user.avatar}
                  name={connection.user.displayName || connection.user.username}
                  size={48}
                />
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: colors.text }]}>
                    {connection.user.displayName || connection.user.username}
                  </Text>
                  <Text style={[styles.memberUsername, { color: colors.textMuted }]}>
                    @{connection.user.username}
                  </Text>
                </View>
                <View style={styles.memberStats}>
                  <View style={[styles.statBadge, { backgroundColor: colors.backgroundSecondary }]}>
                    <Feather name="folder" size={14} color={colors.primary} />
                    <Text style={[styles.statText, { color: colors.primary }]}>
                      {connection.sharedProjectCount}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Shared Projects Modal */}
      <Modal
        visible={showProjectsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProjectsModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Shared with {selectedUser?.displayName || selectedUser?.username}
            </Text>
            <TouchableOpacity onPress={() => setShowProjectsModal(false)}>
              <Feather name="x" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {isLoadingProjects ? (
              <Loading message="Loading projects..." />
            ) : sharedProjects.length === 0 ? (
              <View style={styles.noProjectsContainer}>
                <Feather name="folder" size={48} color={colors.textMuted} />
                <Text style={[styles.noProjectsText, { color: colors.textMuted }]}>
                  No shared projects
                </Text>
              </View>
            ) : (
              sharedProjects.map((project) => (
                <Pressable
                  key={project._id}
                  style={({ pressed }) => [
                    styles.projectRow,
                    { borderBottomColor: colors.borderLight },
                    pressed && { backgroundColor: colors.backgroundSecondary },
                  ]}
                  onPress={() => {
                    setShowProjectsModal(false);
                    router.push(`/(main)/(projects)/${project._id}`);
                  }}
                >
                  <View style={[styles.projectColorDot, { backgroundColor: project.color || colors.primary }]} />
                  <View style={styles.projectInfo}>
                    <Text style={[styles.projectName, { color: colors.text }]}>{project.name}</Text>
                    {project.description && (
                      <Text style={[styles.projectDescription, { color: colors.textMuted }]} numberOfLines={1}>
                        {project.description}
                      </Text>
                    )}
                  </View>
                  <Feather name="chevron-right" size={20} color={colors.textMuted} />
                </Pressable>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    paddingBottom: 32,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  searchContainer: {
    padding: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  membersList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  memberUsername: {
    fontSize: 14,
  },
  memberStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 16,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  noProjectsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  noProjectsText: {
    fontSize: 16,
    marginTop: 16,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  projectColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  projectInfo: {
    flex: 1,
    marginLeft: 12,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '500',
  },
  projectDescription: {
    fontSize: 14,
    marginTop: 2,
  },
});
