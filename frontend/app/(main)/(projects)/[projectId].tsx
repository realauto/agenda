import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '../../../src/hooks/useColors';
import { Card } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { Loading } from '../../../src/components/ui/Loading';
import { Button } from '../../../src/components/ui/Button';
import { Avatar } from '../../../src/components/ui/Avatar';
import { FeedList } from '../../../src/components/feed/FeedList';
import { CategoryFilter } from '../../../src/components/feed/CategoryFilter';
import { useProjectFeed } from '../../../src/hooks/useFeed';
import { projectsApi, type CollaboratorsResponse } from '../../../src/api/projects';
import type { Project, ProjectRole, ProjectStatus } from '../../../src/types';

export default function ProjectDetailScreen() {
  const colors = useColors();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [userRole, setUserRole] = useState<ProjectRole>('viewer');
  const [collaborators, setCollaborators] = useState<CollaboratorsResponse | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [isInviting, setIsInviting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const statusColors: Record<string, string> = {
    active: colors.success,
    paused: colors.warning,
    completed: colors.primary,
    archived: colors.textMuted,
  };

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
    addComment,
    editComment,
    deleteComment,
    setCategoryFilter,
  } = useProjectFeed(projectId);

  useFocusEffect(
    useCallback(() => {
      loadProject();
    }, [projectId])
  );

  const loadProject = async () => {
    if (!projectId) return;
    try {
      const response = await projectsApi.getById(projectId);
      setProject(response.project);
      setUserRole(response.role);

      // Load collaborators
      const collabResponse = await projectsApi.getCollaborators(projectId);
      setCollaborators(collabResponse);
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setProjectLoading(false);
    }
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      showAlert('Error', 'Please enter an email address');
      return;
    }

    setIsInviting(true);
    try {
      await projectsApi.inviteCollaborator(projectId!, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      showAlert('Success', 'Invite sent successfully');
      setInviteEmail('');
      setShowShareModal(false);
      loadProject(); // Refresh collaborators
    } catch (error: any) {
      showAlert('Error', error.response?.data?.message || 'Failed to send invite');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveCollaborator = async (userId: string, name: string) => {
    const performRemove = async () => {
      try {
        await projectsApi.removeCollaborator(projectId!, userId);
        loadProject();
      } catch (error) {
        showAlert('Error', 'Failed to remove collaborator');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Remove Collaborator\n\nAre you sure you want to remove ${name} from this project?`)) {
        await performRemove();
      }
    } else {
      Alert.alert(
        'Remove Collaborator',
        `Are you sure you want to remove ${name} from this project?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: performRemove,
          },
        ]
      );
    }
  };

  const handleArchiveToggle = async () => {
    setShowSettingsMenu(false);
    const isArchived = project?.status === 'archived';
    const title = isArchived ? 'Unarchive Project' : 'Archive Project';
    const message = isArchived
      ? 'This project will be restored and visible in your projects list.'
      : 'This project will be hidden from your default projects view. You can still access it via the "Archived" filter.';

    const performAction = async () => {
      setIsUpdatingStatus(true);
      try {
        const newStatus: ProjectStatus = isArchived ? 'active' : 'archived';
        const response = await projectsApi.update(projectId!, { status: newStatus });
        setProject(response.project);
      } catch (error) {
        showAlert('Error', `Failed to ${isArchived ? 'unarchive' : 'archive'} project`);
      } finally {
        setIsUpdatingStatus(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) {
        await performAction();
      }
    } else {
      const actionText = isArchived ? 'Unarchive' : 'Archive';
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionText,
          style: isArchived ? 'default' : 'destructive',
          onPress: performAction,
        },
      ]);
    }
  };

  if (projectLoading || !project) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
        <Loading message="Loading project..." />
      </SafeAreaView>
    );
  }

  const canEdit = userRole === 'owner' || userRole === 'editor';

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
    if (Platform.OS === 'web') {
      if (window.confirm('Delete Update\n\nAre you sure you want to delete this update?')) {
        await deleteUpdate(updateId);
      }
    } else {
      Alert.alert('Delete Update', 'Are you sure you want to delete this update?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteUpdate(updateId),
        },
      ]);
    }
  };

  const ProjectHeader = () => (
    <View>
      <Card style={styles.projectHeader}>
        <View style={styles.headerTop}>
          {project.color && (
            <View style={[styles.colorDot, { backgroundColor: project.color }]} />
          )}
          <Text style={[styles.projectName, { color: colors.text }]}>{project.name}</Text>
          <Badge
            label={project.status}
            color={statusColors[project.status]}
            size="medium"
          />
          {canEdit && (
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => setShowSettingsMenu(true)}
            >
              <Feather name="more-vertical" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {project.description && (
          <Text style={[styles.projectDescription, { color: colors.textSecondary }]}>{project.description}</Text>
        )}

        {project.tags && project.tags.length > 0 && (
          <View style={styles.tags}>
            {project.tags.map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.tagText, { color: colors.textSecondary }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.projectStats, { borderTopColor: colors.borderLight }]}>
          <View style={styles.stat}>
            <Feather name="message-circle" size={16} color={colors.textMuted} />
            <Text style={[styles.statText, { color: colors.textMuted }]}>{project.stats.totalUpdates} updates</Text>
          </View>

          <View style={styles.stat}>
            <Feather name="users" size={16} color={colors.textMuted} />
            <Text style={[styles.statText, { color: colors.textMuted }]}>
              {(collaborators?.collaborators.length ?? 0) + 1} people
            </Text>
          </View>
        </View>

        {/* Collaborators Preview */}
        {collaborators && (
          <View style={[styles.collaboratorsSection, { borderTopColor: colors.borderLight }]}>
            <View style={styles.collaboratorsHeader}>
              <Text style={[styles.collaboratorsTitle, { color: colors.text }]}>People</Text>
              {canEdit && (
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={() => setShowShareModal(true)}
                >
                  <Feather name="user-plus" size={16} color={colors.primary} />
                  <Text style={[styles.shareButtonText, { color: colors.primary }]}>Share</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Owner */}
            {collaborators.owner && (
              <View style={styles.collaboratorRow}>
                <Avatar
                  uri={collaborators.owner.avatar}
                  name={collaborators.owner.displayName || collaborators.owner.username}
                  size={32}
                />
                <View style={styles.collaboratorInfo}>
                  <Text style={[styles.collaboratorName, { color: colors.text }]}>
                    {collaborators.owner.displayName || collaborators.owner.username}
                  </Text>
                  <Text style={[styles.collaboratorRole, { color: colors.textMuted }]}>Owner</Text>
                </View>
              </View>
            )}

            {/* Collaborators */}
            {collaborators.collaborators.slice(0, 3).map((collab) => (
              <View key={collab.userId} style={styles.collaboratorRow}>
                <Avatar
                  uri={collab.user?.avatar}
                  name={collab.user?.displayName || collab.user?.username || 'User'}
                  size={32}
                />
                <View style={styles.collaboratorInfo}>
                  <Text style={[styles.collaboratorName, { color: colors.text }]}>
                    {collab.user?.displayName || collab.user?.username || 'User'}
                  </Text>
                  <Text style={[styles.collaboratorRole, { color: colors.textMuted }]}>
                    {collab.role.charAt(0).toUpperCase() + collab.role.slice(1)}
                  </Text>
                </View>
                {userRole === 'owner' && (
                  <TouchableOpacity
                    onPress={() =>
                      handleRemoveCollaborator(
                        collab.userId,
                        collab.user?.displayName || collab.user?.username || 'User'
                      )
                    }
                  >
                    <Feather name="x" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {collaborators.collaborators.length > 3 && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => setShowShareModal(true)}
              >
                <Text style={[styles.viewAllText, { color: colors.primary }]}>
                  View all {collaborators.collaborators.length + 1} people
                </Text>
              </TouchableOpacity>
            )}

            {/* Pending Invites */}
            {canEdit && collaborators.pendingInvites.length > 0 && (
              <View style={[styles.pendingSection, { borderTopColor: colors.borderLight }]}>
                <Text style={[styles.pendingTitle, { color: colors.textMuted }]}>Pending invites</Text>
                {collaborators.pendingInvites.map((invite) => (
                  <View key={invite._id} style={styles.pendingRow}>
                    <Feather name="mail" size={16} color={colors.textMuted} />
                    <Text style={[styles.pendingEmail, { color: colors.textSecondary }]}>{invite.email}</Text>
                    <TouchableOpacity
                      onPress={() =>
                        projectsApi.revokeInvite(projectId!, invite._id).then(loadProject)
                      }
                    >
                      <Feather name="x" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </Card>

      <CategoryFilter selected={categoryFilter} onChange={setCategoryFilter} />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]} edges={['left', 'right']}>
      <FeedList
        updates={updates}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        hasMore={hasMore}
        onRefresh={refresh}
        onLoadMore={loadMore}
        onReact={handleReact}
        onDelete={handleDelete}
        onAddComment={addComment}
        onEditComment={editComment}
        onDeleteComment={deleteComment}
        emptyTitle="No updates yet"
        emptyMessage="Post the first update for this project"
        emptyAction={canEdit ? 'Post Update' : undefined}
        onEmptyAction={
          canEdit ? () => router.push(`/(main)/(feed)/new?projectId=${projectId}`) : undefined
        }
        ListHeaderComponent={<ProjectHeader />}
      />

      {canEdit && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => router.push(`/(main)/(feed)/new?projectId=${projectId}`)}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Share Modal */}
      <Modal
        visible={showShareModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowShareModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Share Project</Text>
            <TouchableOpacity onPress={() => setShowShareModal(false)}>
              <Feather name="x" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Invite Form */}
            <View style={styles.inviteSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Invite people</Text>
              <View style={styles.inviteForm}>
                <TextInput
                  style={[styles.emailInput, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                  placeholder="Enter email address"
                  placeholderTextColor={colors.textMuted}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <View style={styles.roleSelector}>
                  <TouchableOpacity
                    style={[
                      styles.roleOption,
                      { borderColor: colors.border },
                      inviteRole === 'editor' && { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
                    ]}
                    onPress={() => setInviteRole('editor')}
                  >
                    <Text
                      style={[
                        styles.roleText,
                        { color: colors.textSecondary },
                        inviteRole === 'editor' && { color: colors.primary },
                      ]}
                    >
                      Editor
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.roleOption,
                      { borderColor: colors.border },
                      inviteRole === 'viewer' && { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
                    ]}
                    onPress={() => setInviteRole('viewer')}
                  >
                    <Text
                      style={[
                        styles.roleText,
                        { color: colors.textSecondary },
                        inviteRole === 'viewer' && { color: colors.primary },
                      ]}
                    >
                      Viewer
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Button
                title="Send Invite"
                onPress={handleInvite}
                loading={isInviting}
                style={styles.inviteButton}
              />
            </View>

            {/* Current Collaborators */}
            <View style={styles.currentSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>People with access</Text>

              {/* Owner */}
              {collaborators?.owner && (
                <View style={[styles.memberRow, { borderBottomColor: colors.borderLight }]}>
                  <Avatar
                    uri={collaborators.owner.avatar}
                    name={collaborators.owner.displayName || collaborators.owner.username}
                    size={40}
                  />
                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: colors.text }]}>
                      {collaborators.owner.displayName || collaborators.owner.username}
                    </Text>
                    <Text style={[styles.memberEmail, { color: colors.textMuted }]}>{collaborators.owner.email}</Text>
                  </View>
                  <Badge label="Owner" color={colors.primary} />
                </View>
              )}

              {/* Collaborators */}
              {collaborators?.collaborators.map((collab) => (
                <View key={collab.userId} style={[styles.memberRow, { borderBottomColor: colors.borderLight }]}>
                  <Avatar
                    uri={collab.user?.avatar}
                    name={collab.user?.displayName || collab.user?.username || 'User'}
                    size={40}
                  />
                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: colors.text }]}>
                      {collab.user?.displayName || collab.user?.username || 'User'}
                    </Text>
                    <Text style={[styles.memberEmail, { color: colors.textMuted }]}>{collab.user?.email}</Text>
                  </View>
                  <Badge
                    label={collab.role.charAt(0).toUpperCase() + collab.role.slice(1)}
                    color={collab.role === 'editor' ? colors.success : colors.textMuted}
                  />
                  {userRole === 'owner' && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() =>
                        handleRemoveCollaborator(
                          collab.userId,
                          collab.user?.displayName || collab.user?.username || 'User'
                        )
                      }
                    >
                      <Feather name="trash-2" size={18} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {/* Pending Invites */}
              {collaborators?.pendingInvites && collaborators.pendingInvites.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { marginTop: 24, color: colors.text }]}>
                    Pending invites
                  </Text>
                  {collaborators.pendingInvites.map((invite) => (
                    <View key={invite._id} style={[styles.memberRow, { borderBottomColor: colors.borderLight }]}>
                      <View style={[styles.pendingAvatar, { backgroundColor: colors.backgroundSecondary }]}>
                        <Feather name="mail" size={20} color={colors.textMuted} />
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={[styles.memberName, { color: colors.text }]}>{invite.email}</Text>
                        <Text style={[styles.memberEmail, { color: colors.textMuted }]}>
                          Invited as {invite.role}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={async () => {
                          await projectsApi.revokeInvite(projectId!, invite._id);
                          loadProject();
                        }}
                      >
                        <Feather name="x" size={18} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Settings Menu Modal */}
      <Modal
        visible={showSettingsMenu}
        animationType="fade"
        transparent
        onRequestClose={() => setShowSettingsMenu(false)}
      >
        <Pressable
          style={styles.settingsMenuOverlay}
          onPress={() => setShowSettingsMenu(false)}
        >
          <View style={[styles.settingsMenuContainer, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={styles.settingsMenuItem}
              onPress={handleArchiveToggle}
              disabled={isUpdatingStatus}
            >
              <Feather
                name={project.status === 'archived' ? 'refresh-cw' : 'archive'}
                size={20}
                color={project.status === 'archived' ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.settingsMenuText,
                  { color: colors.text },
                  project.status === 'archived' && { color: colors.primary },
                ]}
              >
                {project.status === 'archived' ? 'Unarchive Project' : 'Archive Project'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginRight: 8,
  },
  projectDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 13,
  },
  projectStats: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    marginLeft: 6,
  },
  collaboratorsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  collaboratorsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  collaboratorsTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  collaboratorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  collaboratorInfo: {
    flex: 1,
    marginLeft: 10,
  },
  collaboratorName: {
    fontSize: 14,
    fontWeight: '500',
  },
  collaboratorRole: {
    fontSize: 12,
  },
  viewAllButton: {
    marginTop: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  pendingSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  pendingTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  pendingEmail: {
    flex: 1,
    fontSize: 13,
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
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inviteSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  inviteForm: {
    marginBottom: 12,
  },
  emailInput: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  roleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inviteButton: {
    marginTop: 4,
  },
  currentSection: {
    marginBottom: 24,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
  },
  memberEmail: {
    fontSize: 13,
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
  pendingAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButton: {
    marginLeft: 8,
    padding: 4,
  },
  settingsMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsMenuContainer: {
    borderRadius: 12,
    minWidth: 200,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  settingsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  settingsMenuText: {
    fontSize: 16,
  },
});
