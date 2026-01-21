import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { getRoleByValue } from '../../constants/roles';
import type { TeamMember, TeamRole } from '../../types';

interface MemberListProps {
  members: TeamMember[];
  currentUserId?: string;
  ownerId: string;
  canManage: boolean;
  onUpdateRole?: (memberId: string, role: TeamRole) => void;
  onRemove?: (memberId: string) => void;
}

export function MemberList({
  members,
  currentUserId,
  ownerId,
  canManage,
  onUpdateRole,
  onRemove,
}: MemberListProps) {
  const renderMember = ({ item }: { item: TeamMember }) => {
    const role = getRoleByValue(item.role);
    const isOwner = item.userId === ownerId;
    const isSelf = item.userId === currentUserId;

    return (
      <View style={styles.memberItem}>
        <Avatar
          source={item.user?.avatar}
          name={item.user?.displayName || item.user?.username}
          size="medium"
        />
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>
            {item.user?.displayName || item.user?.username || 'Unknown'}
            {isSelf && <Text style={styles.youLabel}> (you)</Text>}
          </Text>
          <View style={styles.roleContainer}>
            <Badge
              label={isOwner ? 'Owner' : role?.label || item.role}
              color={isOwner ? colors.secondary : colors.textMuted}
              size="small"
            />
          </View>
        </View>

        {canManage && !isOwner && !isSelf && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                // Cycle through roles: viewer -> member -> admin
                const newRole =
                  item.role === 'viewer'
                    ? 'member'
                    : item.role === 'member'
                    ? 'admin'
                    : 'viewer';
                onUpdateRole?.(item.userId, newRole);
              }}
            >
              <Feather name="edit-2" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onRemove?.(item.userId)}
            >
              <Feather name="user-minus" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <FlatList
      data={members}
      renderItem={renderMember}
      keyExtractor={(item) => item.userId}
      contentContainerStyle={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
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
  youLabel: {
    fontWeight: '400',
    color: colors.textMuted,
  },
  roleContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
});
