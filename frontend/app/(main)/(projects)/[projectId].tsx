import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../../src/constants/colors';
import { Card } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { Loading } from '../../../src/components/ui/Loading';
import { Button } from '../../../src/components/ui/Button';
import { Avatar } from '../../../src/components/ui/Avatar';
import { FeedList } from '../../../src/components/feed/FeedList';
import { CategoryFilter } from '../../../src/components/feed/CategoryFilter';
import { useProjectFeed } from '../../../src/hooks/useFeed';
import { projectsApi, type CollaboratorsResponse } from '../../../src/api/projects';
import type { Project, ProjectRole, User } from '../../../src/types';

const statusColors: Record<string, string> = {
  active: colors.success,
  paused: colors.warning,
  completed: colors.primary,
  archived: colors.textMuted,
};

export default function ProjectDetailScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [userRole, setUserRole] = useState<ProjectRole>('viewer');
  const [collaborators, setCollaborators] = useState<CollaboratorsResponse | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [isInviting, setIsInviting] = useState(false);

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

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    setIsInviting(true);
    try {
      await projectsApi.inviteCollaborator(projectId!, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      Alert.alert('Success', 'Invite sent successfully');
      setInviteEmail('');
      setShowShareModal(false);
      loadProject(); // Refresh collaborators
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to send invite');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveCollaborator = async (userId: string, name: string) => {
    Alert.alert(
      'Remove Collaborator',
      `Are you sure you want to remove ${name} from this project?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await projectsApi.removeCollaborator(projectId!, userId);
              loadProject();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove collaborator');
            }
          },
        },
      ]
    );
  };

  if (projectLoading || !project) {
    return (
      <SafeAreaView style={styles.container}>
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

          <View style={styles.stat}>
            <Feather name="users" size={16} color={colors.textMuted} />
            <Text style={styles.statText}>
              {(collaborators?.collaborators.length ?? 0) + 1} people
            </Text>
          </View>
        </View>

        {/* Collaborators Preview */}
        {collaborators && (
          <View style={styles.collaboratorsSection}>
            <View style={styles.collaboratorsHeader}>
              <Text style={styles.collaboratorsTitle}>People</Text>
              {canEdit && (
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={() => setShowShareModal(true)}
                >
                  <Feather name="user-plus" size={16} color={colors.primary} />
                  <Text style={styles.shareButtonText}>Share</Text>
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
                  <Text style={styles.collaboratorName}>
                    {collaborators.owner.displayName || collaborators.owner.username}
                  </Text>
                  <Text style={styles.collaboratorRole}>Owner</Text>
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
                  <Text style={styles.collaboratorName}>
                    {collab.user?.displayName || collab.user?.username || 'User'}
                  </Text>
                  <Text style={styles.collaboratorRole}>
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
                <Text style={styles.viewAllText}>
                  View all {collaborators.collaborators.length + 1} people
                </Text>
              </TouchableOpacity>
            )}

            {/* Pending Invites */}
            {canEdit && collaborators.pendingInvites.length > 0 && (
              <View style={styles.pendingSection}>
                <Text style={styles.pendingTitle}>Pending invites</Text>
                {collaborators.pendingInvites.map((invite) => (
                  <View key={invite._id} style={styles.pendingRow}>
                    <Feather name="mail" size={16} color={colors.textMuted} />
                    <Text style={styles.pendingEmail}>{invite.email}</Text>
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
          style={styles.fab}
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
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Share Project</Text>
            <TouchableOpacity onPress={() => setShowShareModal(false)}>
              <Feather name="x" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Invite Form */}
            <View style={styles.inviteSection}>
              <Text style={styles.sectionTitle}>Invite people</Text>
              <View style={styles.inviteForm}>
                <TextInput
                  style={styles.emailInput}
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
                      inviteRole === 'editor' && styles.roleOptionActive,
                    ]}
                    onPress={() => setInviteRole('editor')}
                  >
                    <Text
                      style={[
                        styles.roleText,
                        inviteRole === 'editor' && styles.roleTextActive,
                      ]}
                    >
                      Editor
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.roleOption,
                      inviteRole === 'viewer' && styles.roleOptionActive,
                    ]}
                    onPress={() => setInviteRole('viewer')}
                  >
                    <Text
                      style={[
                        styles.roleText,
                        inviteRole === 'viewer' && styles.roleTextActive,
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
              <Text style={styles.sectionTitle}>People with access</Text>

              {/* Owner */}
              {collaborators?.owner && (
                <View style={styles.memberRow}>
                  <Avatar
                    uri={collaborators.owner.avatar}
                    name={collaborators.owner.displayName || collaborators.owner.username}
                    size={40}
                  />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {collaborators.owner.displayName || collaborators.owner.username}
                    </Text>
                    <Text style={styles.memberEmail}>{collaborators.owner.email}</Text>
                  </View>
                  <Badge label="Owner" color={colors.primary} />
                </View>
              )}

              {/* Collaborators */}
              {collaborators?.collaborators.map((collab) => (
                <View key={collab.userId} style={styles.memberRow}>
                  <Avatar
                    uri={collab.user?.avatar}
                    name={collab.user?.displayName || collab.user?.username || 'User'}
                    size={40}
                  />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>
                      {collab.user?.displayName || collab.user?.username || 'User'}
                    </Text>
                    <Text style={styles.memberEmail}>{collab.user?.email}</Text>
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
                  <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
                    Pending invites
                  </Text>
                  {collaborators.pendingInvites.map((invite) => (
                    <View key={invite._id} style={styles.memberRow}>
                      <View style={styles.pendingAvatar}>
                        <Feather name="mail" size={20} color={colors.textMuted} />
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{invite.email}</Text>
                        <Text style={styles.memberEmail}>
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
    gap: 16,
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
  collaboratorsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
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
    color: colors.text,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
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
    color: colors.text,
  },
  collaboratorRole: {
    fontSize: 12,
    color: colors.textMuted,
  },
  viewAllButton: {
    marginTop: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  pendingSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  pendingTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
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
    color: colors.textSecondary,
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
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
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
    color: colors.text,
    marginBottom: 12,
  },
  inviteForm: {
    marginBottom: 12,
  },
  emailInput: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
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
    borderColor: colors.border,
    alignItems: 'center',
  },
  roleOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  roleText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  roleTextActive: {
    color: colors.primary,
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
    borderBottomColor: colors.borderLight,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  memberEmail: {
    fontSize: 13,
    color: colors.textMuted,
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
  pendingAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
