import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../../src/constants/colors';
import { Avatar } from '../../../src/components/ui/Avatar';
import { Button } from '../../../src/components/ui/Button';
import { Card } from '../../../src/components/ui/Card';
import { Loading } from '../../../src/components/ui/Loading';
import { ProjectCard } from '../../../src/components/project/ProjectCard';
import { MemberList } from '../../../src/components/team/MemberList';
import { useTeam } from '../../../src/hooks/useTeam';
import { useProjects } from '../../../src/hooks/useProject';
import { useAuthStore } from '../../../src/store/authStore';
import { canManageTeam } from '../../../src/constants/roles';
import type { TeamRole } from '../../../src/types';

type TabType = 'projects' | 'members' | 'settings';

export default function TeamDetailScreen() {
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('projects');

  const user = useAuthStore((state) => state.user);
  const {
    team,
    members,
    isLoading,
    updateMemberRole,
    removeMember,
    leaveTeam,
    deleteTeam,
  } = useTeam(teamId);
  const { projects, isLoading: projectsLoading } = useProjects(teamId);

  if (isLoading || !team) {
    return (
      <SafeAreaView style={styles.container}>
        <Loading message="Loading team..." />
      </SafeAreaView>
    );
  }

  const currentMember = team.members.find((m) => m.userId.toString() === user?._id);
  const canManage = currentMember ? canManageTeam(currentMember.role) : false;
  const isOwner = team.ownerId.toString() === user?._id;

  const handleUpdateRole = async (memberId: string, role: TeamRole) => {
    try {
      await updateMemberRole(memberId, role);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleRemoveMember = (memberId: string) => {
    Alert.alert('Remove Member', 'Are you sure you want to remove this member?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeMember(memberId),
      },
    ]);
  };

  const handleLeave = () => {
    Alert.alert('Leave Team', 'Are you sure you want to leave this team?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await leaveTeam();
          router.back();
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Team',
      'This will delete the team and all its projects and updates. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTeam();
            router.back();
          },
        },
      ]
    );
  };

  const renderTab = (tab: TabType, label: string, icon: string) => (
    <TouchableOpacity
      key={tab}
      style={[styles.tab, activeTab === tab && styles.tabActive]}
      onPress={() => setActiveTab(tab)}
    >
      <Feather
        name={icon as any}
        size={18}
        color={activeTab === tab ? colors.primary : colors.textSecondary}
      />
      <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Header */}
      <Card style={styles.header}>
        <View style={styles.headerContent}>
          <Avatar source={team.avatar} name={team.name} size="xlarge" />
          <View style={styles.headerInfo}>
            <Text style={styles.teamName}>{team.name}</Text>
            {team.description && (
              <Text style={styles.teamDescription} numberOfLines={2}>
                {team.description}
              </Text>
            )}
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Feather name="users" size={14} color={colors.textMuted} />
                <Text style={styles.statText}>{team.members.length} members</Text>
              </View>
              <View style={styles.stat}>
                <Feather name="folder" size={14} color={colors.textMuted} />
                <Text style={styles.statText}>{projects.length} projects</Text>
              </View>
            </View>
          </View>
        </View>
      </Card>

      {/* Tabs */}
      <View style={styles.tabs}>
        {renderTab('projects', 'Projects', 'folder')}
        {renderTab('members', 'Members', 'users')}
        {canManage && renderTab('settings', 'Settings', 'settings')}
      </View>

      {/* Tab Content */}
      {activeTab === 'projects' && (
        <FlatList
          data={projects}
          renderItem={({ item }) => (
            <ProjectCard
              project={item}
              onPress={() => router.push(`/(main)/(projects)/${item._id}`)}
            />
          )}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.projectList}
          ListEmptyComponent={
            <View style={styles.emptyTab}>
              <Text style={styles.emptyText}>No projects yet</Text>
              <Button
                title="Create Project"
                variant="outline"
                onPress={() => router.push(`/(main)/(projects)/new?teamId=${teamId}`)}
              />
            </View>
          }
        />
      )}

      {activeTab === 'members' && (
        <View style={styles.membersContainer}>
          {canManage && (
            <Button
              title="Invite Member"
              variant="outline"
              onPress={() => {
                // TODO: Implement invite modal
                Alert.alert('Coming Soon', 'Invite functionality will be added');
              }}
              style={styles.inviteButton}
            />
          )}
          <MemberList
            members={members}
            currentUserId={user?._id}
            ownerId={team.ownerId.toString()}
            canManage={canManage}
            onUpdateRole={handleUpdateRole}
            onRemove={handleRemoveMember}
          />
        </View>
      )}

      {activeTab === 'settings' && canManage && (
        <ScrollView style={styles.settings}>
          <Card style={styles.settingsCard}>
            <Text style={styles.settingsTitle}>Team Settings</Text>
            <TouchableOpacity style={styles.settingsItem}>
              <View style={styles.settingsItemInfo}>
                <Text style={styles.settingsItemLabel}>Edit Team</Text>
                <Text style={styles.settingsItemDescription}>
                  Change name, description, and avatar
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </Card>

          <Card style={styles.settingsCard}>
            <Text style={[styles.settingsTitle, { color: colors.error }]}>
              Danger Zone
            </Text>
            {!isOwner && (
              <TouchableOpacity
                style={styles.settingsItem}
                onPress={handleLeave}
              >
                <View style={styles.settingsItemInfo}>
                  <Text style={[styles.settingsItemLabel, { color: colors.error }]}>
                    Leave Team
                  </Text>
                  <Text style={styles.settingsItemDescription}>
                    You will lose access to all team content
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            {isOwner && (
              <TouchableOpacity
                style={styles.settingsItem}
                onPress={handleDelete}
              >
                <View style={styles.settingsItemInfo}>
                  <Text style={[styles.settingsItemLabel, { color: colors.error }]}>
                    Delete Team
                  </Text>
                  <Text style={styles.settingsItemDescription}>
                    Permanently delete this team and all its data
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </Card>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    margin: 16,
    marginBottom: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  teamName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  teamDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  stats: {
    flexDirection: 'row',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 13,
    color: colors.textMuted,
    marginLeft: 4,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  tabActive: {
    backgroundColor: colors.primaryLight + '20',
  },
  tabText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '500',
  },
  projectList: {
    paddingVertical: 8,
  },
  emptyTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  membersContainer: {
    flex: 1,
  },
  inviteButton: {
    margin: 16,
    marginBottom: 0,
  },
  settings: {
    flex: 1,
    padding: 16,
  },
  settingsCard: {
    marginBottom: 16,
  },
  settingsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  settingsItemInfo: {
    flex: 1,
  },
  settingsItemLabel: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 2,
  },
  settingsItemDescription: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
