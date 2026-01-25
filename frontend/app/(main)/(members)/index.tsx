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
  Alert,
  Platform,
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
import type { UserConnection, User, Project, GlobalProjectAccess } from '../../../src/types';

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

  // Add user modal state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addUserSearch, setAddUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [isLoadingUserProjects, setIsLoadingUserProjects] = useState(false);
  const [selectedUserForInvite, setSelectedUserForInvite] = useState<User | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);

  // Global access state
  const [accessMode, setAccessMode] = useState<'project' | 'global'>('project');
  const [globalAccessLevel, setGlobalAccessLevel] = useState<GlobalProjectAccess>('edit');

  // Add by email state
  const [addUserTab, setAddUserTab] = useState<'search' | 'email'>('search');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserGlobalAccess, setNewUserGlobalAccess] = useState<GlobalProjectAccess | null>('edit');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createdUserPassword, setCreatedUserPassword] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<User | null>(null);

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

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSearchUsers = async (query: string) => {
    setAddUserSearch(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { users } = await usersApi.searchUsers(query);
      setSearchResults(users);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectUserForInvite = async (user: User) => {
    setSelectedUserForInvite(user);
    setIsLoadingUserProjects(true);

    try {
      // Get projects where current user is owner or editor (can invite)
      const response = await projectsApi.getAll();
      const myProjects = response.projects.filter((project) => {
        // Only show projects where user can invite (owner or editor)
        // and where the selected user is not already a collaborator
        const isAlreadyMember =
          project.ownerId === user._id ||
          project.collaborators?.some((c) => c.userId === user._id);
        return !isAlreadyMember;
      });
      setUserProjects(myProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoadingUserProjects(false);
    }
  };

  const handleInviteToProject = async () => {
    if (!selectedUserForInvite || !selectedProjectId) return;

    setIsInviting(true);
    try {
      await projectsApi.addCollaborator(selectedProjectId, selectedUserForInvite._id, 'editor');
      showAlert('Success', `${selectedUserForInvite.displayName || selectedUserForInvite.username} added to project`);
      setShowAddUserModal(false);
      setAddUserSearch('');
      setSearchResults([]);
      setSelectedUserForInvite(null);
      setSelectedProjectId(null);
      loadConnections(); // Refresh connections
    } catch (error: any) {
      showAlert('Error', error.response?.data?.message || 'Failed to add user to project');
    } finally {
      setIsInviting(false);
    }
  };

  const handleGrantGlobalAccess = async () => {
    if (!selectedUserForInvite) return;

    setIsInviting(true);
    try {
      await usersApi.setGlobalProjectAccess(selectedUserForInvite._id, globalAccessLevel);
      showAlert(
        'Success',
        `${selectedUserForInvite.displayName || selectedUserForInvite.username} now has ${globalAccessLevel === 'edit' ? 'full edit' : 'view-only'} access to all projects`
      );
      resetAddUserModal();
      loadConnections();
    } catch (error: any) {
      showAlert('Error', error.response?.data?.message || 'Failed to grant global access');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveGlobalAccess = async (user: User) => {
    const performRemove = async () => {
      try {
        await usersApi.setGlobalProjectAccess(user._id, null);
        showAlert('Success', `Global access removed for ${user.displayName || user.username}`);
        loadConnections();
      } catch (error: any) {
        showAlert('Error', error.response?.data?.message || 'Failed to remove global access');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Remove Global Access\n\nAre you sure you want to remove global project access for ${user.displayName || user.username}?`)) {
        await performRemove();
      }
    } else {
      Alert.alert(
        'Remove Global Access',
        `Are you sure you want to remove global project access for ${user.displayName || user.username}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: performRemove },
        ]
      );
    }
  };

  const handleCreateUserByEmail = async () => {
    if (!newUserEmail.trim()) {
      showAlert('Error', 'Please enter an email address');
      return;
    }

    setIsCreatingUser(true);
    try {
      const result = await usersApi.createByEmail(newUserEmail.trim(), newUserGlobalAccess);
      setCreatedUser(result.user);
      setCreatedUserPassword(result.temporaryPassword);
      loadConnections();
    } catch (error: any) {
      showAlert('Error', error.response?.data?.message || 'Failed to create user');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (Platform.OS === 'web') {
      navigator.clipboard.writeText(text);
      showAlert('Copied', 'Copied to clipboard');
    } else {
      showAlert('Credentials', text);
    }
  };

  const resetAddUserModal = () => {
    setShowAddUserModal(false);
    setAddUserSearch('');
    setSearchResults([]);
    setSelectedUserForInvite(null);
    setSelectedProjectId(null);
    setAccessMode('project');
    setGlobalAccessLevel('edit');
    setAddUserTab('search');
    setNewUserEmail('');
    setNewUserGlobalAccess('edit');
    setCreatedUserPassword(null);
    setCreatedUser(null);
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
          <View style={styles.searchRow}>
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
            <TouchableOpacity
              style={[styles.addUserButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowAddUserModal(true)}
            >
              <Feather name="user-plus" size={20} color="#fff" />
            </TouchableOpacity>
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
                  <View style={styles.memberNameRow}>
                    <Text style={[styles.memberName, { color: colors.text }]}>
                      {connection.user.displayName || connection.user.username}
                    </Text>
                    {connection.user.globalProjectAccess && (
                      <View style={[styles.globalAccessBadge, { backgroundColor: colors.primary + '20' }]}>
                        <Feather name="globe" size={10} color={colors.primary} />
                        <Text style={[styles.globalAccessBadgeText, { color: colors.primary }]}>
                          {connection.user.globalProjectAccess === 'edit' ? 'Full' : 'View'}
                        </Text>
                      </View>
                    )}
                  </View>
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

      {/* Add User Modal */}
      <Modal
        visible={showAddUserModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={resetAddUserModal}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {selectedUserForInvite ? 'Select Project' : 'Add User'}
            </Text>
            <TouchableOpacity onPress={resetAddUserModal}>
              <Feather name="x" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {createdUserPassword && createdUser ? (
              // Show created user credentials
              <View style={styles.createdUserContainer}>
                <View style={[styles.successIcon, { backgroundColor: colors.success + '20' }]}>
                  <Feather name="check-circle" size={48} color={colors.success} />
                </View>
                <Text style={[styles.createdUserTitle, { color: colors.text }]}>
                  User Created Successfully
                </Text>
                <Text style={[styles.createdUserSubtitle, { color: colors.textSecondary }]}>
                  Share these credentials with the user
                </Text>

                <View style={[styles.credentialsBox, { backgroundColor: colors.backgroundSecondary }]}>
                  <View style={styles.credentialRow}>
                    <Text style={[styles.credentialLabel, { color: colors.textMuted }]}>Email</Text>
                    <View style={styles.credentialValueRow}>
                      <Text style={[styles.credentialValue, { color: colors.text }]}>{createdUser.email}</Text>
                      <TouchableOpacity onPress={() => copyToClipboard(createdUser.email)}>
                        <Feather name="copy" size={18} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={[styles.credentialDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.credentialRow}>
                    <Text style={[styles.credentialLabel, { color: colors.textMuted }]}>Password</Text>
                    <View style={styles.credentialValueRow}>
                      <Text style={[styles.credentialValue, { color: colors.text }]}>{createdUserPassword}</Text>
                      <TouchableOpacity onPress={() => copyToClipboard(createdUserPassword)}>
                        <Feather name="copy" size={18} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.copyAllButton, { borderColor: colors.primary }]}
                  onPress={() => copyToClipboard(`Email: ${createdUser.email}\nPassword: ${createdUserPassword}`)}
                >
                  <Feather name="copy" size={18} color={colors.primary} />
                  <Text style={[styles.copyAllButtonText, { color: colors.primary }]}>Copy All</Text>
                </TouchableOpacity>

                {newUserGlobalAccess && (
                  <View style={[styles.accessGrantedNote, { backgroundColor: colors.primary + '15' }]}>
                    <Feather name="globe" size={16} color={colors.primary} />
                    <Text style={[styles.accessGrantedText, { color: colors.primary }]}>
                      Full {newUserGlobalAccess === 'edit' ? 'edit' : 'view'} access granted to all projects
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.inviteButton, { backgroundColor: colors.primary }]}
                  onPress={resetAddUserModal}
                >
                  <Text style={styles.inviteButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : !selectedUserForInvite ? (
              <>
                {/* Tabs: Search / Add by Email */}
                <View style={styles.tabContainer}>
                  <TouchableOpacity
                    style={[
                      styles.tab,
                      { borderBottomColor: addUserTab === 'search' ? colors.primary : 'transparent' },
                    ]}
                    onPress={() => setAddUserTab('search')}
                  >
                    <Feather
                      name="search"
                      size={18}
                      color={addUserTab === 'search' ? colors.primary : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.tabText,
                        { color: addUserTab === 'search' ? colors.primary : colors.textMuted },
                      ]}
                    >
                      Search
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.tab,
                      { borderBottomColor: addUserTab === 'email' ? colors.primary : 'transparent' },
                    ]}
                    onPress={() => setAddUserTab('email')}
                  >
                    <Feather
                      name="mail"
                      size={18}
                      color={addUserTab === 'email' ? colors.primary : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.tabText,
                        { color: addUserTab === 'email' ? colors.primary : colors.textMuted },
                      ]}
                    >
                      Add by Email
                    </Text>
                  </TouchableOpacity>
                </View>

                {addUserTab === 'search' ? (
                  <>
                    {/* Search for users */}
                    <View style={styles.addUserSearchContainer}>
                      <Text style={[styles.addUserLabel, { color: colors.text }]}>
                        Search for an existing user
                      </Text>
                      <View style={[styles.addUserSearchBar, { backgroundColor: colors.backgroundSecondary }]}>
                        <Feather name="search" size={18} color={colors.textMuted} />
                        <TextInput
                          style={[styles.addUserSearchInput, { color: colors.text }]}
                          placeholder="Search by name, username, or email..."
                          placeholderTextColor={colors.textMuted}
                          value={addUserSearch}
                          onChangeText={handleSearchUsers}
                          autoCapitalize="none"
                        />
                        {addUserSearch.length > 0 && (
                          <TouchableOpacity onPress={() => handleSearchUsers('')}>
                            <Feather name="x" size={18} color={colors.textMuted} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {/* Search Results */}
                    {addUserSearch.length >= 2 && (
                      <View style={styles.addUserResults}>
                        {isSearching ? (
                          <Text style={[styles.searchingText, { color: colors.textMuted }]}>Searching...</Text>
                        ) : searchResults.length > 0 ? (
                          searchResults.map((user) => (
                            <TouchableOpacity
                              key={user._id}
                              style={[styles.addUserResultRow, { borderBottomColor: colors.borderLight }]}
                              onPress={() => handleSelectUserForInvite(user)}
                            >
                              <Avatar
                                uri={user.avatar}
                                name={user.displayName || user.username}
                                size={44}
                              />
                              <View style={styles.addUserResultInfo}>
                                <Text style={[styles.addUserResultName, { color: colors.text }]}>
                                  {user.displayName || user.username}
                                </Text>
                                <Text style={[styles.addUserResultUsername, { color: colors.textMuted }]}>
                                  @{user.username}
                                </Text>
                              </View>
                              <Feather name="chevron-right" size={20} color={colors.textMuted} />
                            </TouchableOpacity>
                          ))
                        ) : (
                          <Text style={[styles.noResultsText, { color: colors.textMuted }]}>
                            No users found
                          </Text>
                        )}
                      </View>
                    )}
                  </>
                ) : (
                  <>
                    {/* Add by Email */}
                    <View style={styles.addByEmailContainer}>
                      <Text style={[styles.addUserLabel, { color: colors.text }]}>
                        Create a new user account
                      </Text>
                      <Text style={[styles.addByEmailDesc, { color: colors.textSecondary }]}>
                        Enter their email to create an account with a temporary password you can share.
                      </Text>

                      <TextInput
                        style={[styles.emailInput, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                        placeholder="Enter email address"
                        placeholderTextColor={colors.textMuted}
                        value={newUserEmail}
                        onChangeText={setNewUserEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                      />

                      <Text style={[styles.selectProjectLabel, { color: colors.text, marginTop: 20 }]}>
                        Grant access to projects:
                      </Text>

                      <View style={styles.accessLevelContainer}>
                        <TouchableOpacity
                          style={[
                            styles.accessLevelOption,
                            { borderColor: colors.border },
                            newUserGlobalAccess === 'edit' && { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
                          ]}
                          onPress={() => setNewUserGlobalAccess('edit')}
                        >
                          <Feather
                            name="edit-2"
                            size={20}
                            color={newUserGlobalAccess === 'edit' ? colors.primary : colors.textSecondary}
                          />
                          <View style={styles.accessLevelInfo}>
                            <Text
                              style={[
                                styles.accessLevelTitle,
                                { color: newUserGlobalAccess === 'edit' ? colors.primary : colors.text },
                              ]}
                            >
                              Full Edit Access
                            </Text>
                            <Text style={[styles.accessLevelDesc, { color: colors.textMuted }]}>
                              Can view and edit all projects
                            </Text>
                          </View>
                          {newUserGlobalAccess === 'edit' && (
                            <Feather name="check" size={20} color={colors.primary} />
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.accessLevelOption,
                            { borderColor: colors.border },
                            newUserGlobalAccess === 'view' && { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
                          ]}
                          onPress={() => setNewUserGlobalAccess('view')}
                        >
                          <Feather
                            name="eye"
                            size={20}
                            color={newUserGlobalAccess === 'view' ? colors.primary : colors.textSecondary}
                          />
                          <View style={styles.accessLevelInfo}>
                            <Text
                              style={[
                                styles.accessLevelTitle,
                                { color: newUserGlobalAccess === 'view' ? colors.primary : colors.text },
                              ]}
                            >
                              View Only Access
                            </Text>
                            <Text style={[styles.accessLevelDesc, { color: colors.textMuted }]}>
                              Can view all projects but not edit
                            </Text>
                          </View>
                          {newUserGlobalAccess === 'view' && (
                            <Feather name="check" size={20} color={colors.primary} />
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.accessLevelOption,
                            { borderColor: colors.border },
                            newUserGlobalAccess === null && { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
                          ]}
                          onPress={() => setNewUserGlobalAccess(null)}
                        >
                          <Feather
                            name="user"
                            size={20}
                            color={newUserGlobalAccess === null ? colors.primary : colors.textSecondary}
                          />
                          <View style={styles.accessLevelInfo}>
                            <Text
                              style={[
                                styles.accessLevelTitle,
                                { color: newUserGlobalAccess === null ? colors.primary : colors.text },
                              ]}
                            >
                              No Access
                            </Text>
                            <Text style={[styles.accessLevelDesc, { color: colors.textMuted }]}>
                              Add to specific projects later
                            </Text>
                          </View>
                          {newUserGlobalAccess === null && (
                            <Feather name="check" size={20} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.inviteButton,
                          { backgroundColor: colors.primary },
                          (isCreatingUser || !newUserEmail.trim()) && { opacity: 0.5 },
                        ]}
                        onPress={handleCreateUserByEmail}
                        disabled={isCreatingUser || !newUserEmail.trim()}
                      >
                        <Text style={styles.inviteButtonText}>
                          {isCreatingUser ? 'Creating...' : 'Create User'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </>
            ) : (
              <>
                {/* Selected user header */}
                <View style={[styles.selectedUserHeader, { borderBottomColor: colors.border }]}>
                  <TouchableOpacity onPress={() => setSelectedUserForInvite(null)} style={styles.backButton}>
                    <Feather name="arrow-left" size={20} color={colors.primary} />
                  </TouchableOpacity>
                  <Avatar
                    uri={selectedUserForInvite.avatar}
                    name={selectedUserForInvite.displayName || selectedUserForInvite.username}
                    size={40}
                  />
                  <View style={styles.selectedUserInfo}>
                    <Text style={[styles.selectedUserName, { color: colors.text }]}>
                      {selectedUserForInvite.displayName || selectedUserForInvite.username}
                    </Text>
                    <Text style={[styles.selectedUserUsername, { color: colors.textMuted }]}>
                      @{selectedUserForInvite.username}
                    </Text>
                  </View>
                </View>

                {/* Access mode toggle */}
                <View style={styles.accessModeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.accessModeOption,
                      { borderColor: colors.border },
                      accessMode === 'project' && { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
                    ]}
                    onPress={() => setAccessMode('project')}
                  >
                    <Feather
                      name="folder"
                      size={18}
                      color={accessMode === 'project' ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.accessModeText,
                        { color: accessMode === 'project' ? colors.primary : colors.textSecondary },
                      ]}
                    >
                      Add to Project
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.accessModeOption,
                      { borderColor: colors.border },
                      accessMode === 'global' && { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
                    ]}
                    onPress={() => setAccessMode('global')}
                  >
                    <Feather
                      name="globe"
                      size={18}
                      color={accessMode === 'global' ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.accessModeText,
                        { color: accessMode === 'global' ? colors.primary : colors.textSecondary },
                      ]}
                    >
                      Full Access
                    </Text>
                  </TouchableOpacity>
                </View>

                {accessMode === 'project' ? (
                  <>
                    {/* Project selection */}
                    <Text style={[styles.selectProjectLabel, { color: colors.text }]}>
                      Select a project to add this user to:
                    </Text>

                    {isLoadingUserProjects ? (
                      <Text style={[styles.searchingText, { color: colors.textMuted }]}>Loading projects...</Text>
                    ) : userProjects.length > 0 ? (
                      <View style={styles.projectsList}>
                        {userProjects.map((project) => (
                          <TouchableOpacity
                            key={project._id}
                            style={[
                              styles.projectSelectRow,
                              { borderColor: colors.border },
                              selectedProjectId === project._id && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                            ]}
                            onPress={() => setSelectedProjectId(project._id)}
                          >
                            <View style={[styles.projectColorDot, { backgroundColor: project.color || colors.primary }]} />
                            <Text style={[styles.projectSelectName, { color: colors.text }]} numberOfLines={1}>
                              {project.name}
                            </Text>
                            {selectedProjectId === project._id && (
                              <Feather name="check" size={20} color={colors.primary} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                      <View style={styles.noProjectsContainer}>
                        <Feather name="folder" size={48} color={colors.textMuted} />
                        <Text style={[styles.noProjectsText, { color: colors.textMuted }]}>
                          No available projects
                        </Text>
                        <Text style={[styles.noProjectsSubtext, { color: colors.textMuted }]}>
                          This user is already a member of all your projects
                        </Text>
                      </View>
                    )}

                    {/* Add button */}
                    {userProjects.length > 0 && (
                      <TouchableOpacity
                        style={[
                          styles.inviteButton,
                          { backgroundColor: colors.primary },
                          (!selectedProjectId || isInviting) && { opacity: 0.5 },
                        ]}
                        onPress={handleInviteToProject}
                        disabled={!selectedProjectId || isInviting}
                      >
                        <Text style={styles.inviteButtonText}>
                          {isInviting ? 'Adding...' : 'Add to Project'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <>
                    {/* Global access section */}
                    <View style={[styles.globalAccessInfo, { backgroundColor: colors.backgroundSecondary }]}>
                      <Feather name="info" size={18} color={colors.primary} />
                      <Text style={[styles.globalAccessInfoText, { color: colors.textSecondary }]}>
                        Full access gives this user access to all current and future projects.
                      </Text>
                    </View>

                    <Text style={[styles.selectProjectLabel, { color: colors.text }]}>
                      Select access level:
                    </Text>

                    <View style={styles.accessLevelContainer}>
                      <TouchableOpacity
                        style={[
                          styles.accessLevelOption,
                          { borderColor: colors.border },
                          globalAccessLevel === 'edit' && { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
                        ]}
                        onPress={() => setGlobalAccessLevel('edit')}
                      >
                        <Feather
                          name="edit-2"
                          size={20}
                          color={globalAccessLevel === 'edit' ? colors.primary : colors.textSecondary}
                        />
                        <View style={styles.accessLevelInfo}>
                          <Text
                            style={[
                              styles.accessLevelTitle,
                              { color: globalAccessLevel === 'edit' ? colors.primary : colors.text },
                            ]}
                          >
                            Full Edit Access
                          </Text>
                          <Text style={[styles.accessLevelDesc, { color: colors.textMuted }]}>
                            Can view and edit all projects
                          </Text>
                        </View>
                        {globalAccessLevel === 'edit' && (
                          <Feather name="check" size={20} color={colors.primary} />
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.accessLevelOption,
                          { borderColor: colors.border },
                          globalAccessLevel === 'view' && { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
                        ]}
                        onPress={() => setGlobalAccessLevel('view')}
                      >
                        <Feather
                          name="eye"
                          size={20}
                          color={globalAccessLevel === 'view' ? colors.primary : colors.textSecondary}
                        />
                        <View style={styles.accessLevelInfo}>
                          <Text
                            style={[
                              styles.accessLevelTitle,
                              { color: globalAccessLevel === 'view' ? colors.primary : colors.text },
                            ]}
                          >
                            View Only Access
                          </Text>
                          <Text style={[styles.accessLevelDesc, { color: colors.textMuted }]}>
                            Can view all projects but not edit
                          </Text>
                        </View>
                        {globalAccessLevel === 'view' && (
                          <Feather name="check" size={20} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.inviteButton,
                        { backgroundColor: colors.primary },
                        isInviting && { opacity: 0.5 },
                      ]}
                      onPress={handleGrantGlobalAccess}
                      disabled={isInviting}
                    >
                      <Text style={styles.inviteButtonText}>
                        {isInviting ? 'Granting Access...' : 'Grant Full Access'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addUserButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flex: 1,
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
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
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
  addUserSearchContainer: {
    marginBottom: 16,
  },
  addUserLabel: {
    fontSize: 14,
    marginBottom: 12,
  },
  addUserSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  addUserSearchInput: {
    flex: 1,
    fontSize: 16,
  },
  addUserResults: {
    marginTop: 8,
  },
  addUserResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  addUserResultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  addUserResultName: {
    fontSize: 16,
    fontWeight: '500',
  },
  addUserResultUsername: {
    fontSize: 14,
    marginTop: 2,
  },
  searchingText: {
    textAlign: 'center',
    padding: 16,
    fontSize: 14,
  },
  noResultsText: {
    textAlign: 'center',
    padding: 16,
    fontSize: 14,
  },
  selectedUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  selectedUserInfo: {
    flex: 1,
    marginLeft: 12,
  },
  selectedUserName: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectedUserUsername: {
    fontSize: 14,
    marginTop: 2,
  },
  selectProjectLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  projectsList: {
    gap: 8,
  },
  projectSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  projectColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  projectSelectName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  noProjectsSubtext: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  inviteButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  accessModeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  accessModeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  accessModeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  globalAccessInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    gap: 10,
  },
  globalAccessInfoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  accessLevelContainer: {
    gap: 10,
  },
  accessLevelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 14,
  },
  accessLevelInfo: {
    flex: 1,
  },
  accessLevelTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  accessLevelDesc: {
    fontSize: 13,
  },
  globalAccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  globalAccessBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  addByEmailContainer: {
    paddingTop: 8,
  },
  addByEmailDesc: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  emailInput: {
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
  createdUserContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  createdUserTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  createdUserSubtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  credentialsBox: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  credentialRow: {
    paddingVertical: 8,
  },
  credentialLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  credentialValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  credentialValue: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  credentialDivider: {
    height: 1,
    marginVertical: 8,
  },
  copyAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginBottom: 16,
  },
  copyAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  accessGrantedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
    width: '100%',
  },
  accessGrantedText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
