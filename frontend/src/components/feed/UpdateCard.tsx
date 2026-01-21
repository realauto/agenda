import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, categoryColors, moodColors } from '../../constants/colors';
import { getCategoryByValue, getMoodByValue } from '../../constants/categories';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import type { Update } from '../../types';
import { useAuthStore } from '../../store/authStore';

interface UpdateCardProps {
  update: Update;
  onReact?: (emoji: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPress?: () => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '🎉', '🚀', '👀'];

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
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export function UpdateCard({
  update,
  onReact,
  onEdit,
  onDelete,
  onPress,
}: UpdateCardProps) {
  const [showActions, setShowActions] = useState(false);
  const user = useAuthStore((state) => state.user);
  const isAuthor = user?._id === update.authorId;

  const category = getCategoryByValue(update.category);
  const mood = getMoodByValue(update.mood);

  // Group reactions by emoji
  const reactionGroups = update.reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction.userId);
    return acc;
  }, {} as Record<string, string[]>);

  const handleReaction = (emoji: string) => {
    onReact?.(emoji);
  };

  return (
    <Card style={styles.card} onPress={onPress}>
      {/* Header */}
      <View style={styles.header}>
        <Avatar
          source={update.author?.avatar}
          name={update.author?.displayName || update.author?.username}
          size="medium"
        />
        <View style={styles.headerInfo}>
          <Text style={styles.authorName}>
            {update.author?.displayName || update.author?.username || 'Unknown'}
          </Text>
          <View style={styles.meta}>
            <Text style={styles.time}>{formatRelativeTime(update.createdAt)}</Text>
            {update.isEdited && <Text style={styles.edited}> · edited</Text>}
          </View>
        </View>
        <View style={styles.badges}>
          {category && (
            <Badge
              label={category.label}
              color={categoryColors[update.category]}
              size="small"
            />
          )}
        </View>
        {isAuthor && (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setShowActions(!showActions)}
          >
            <Feather name="more-horizontal" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Action Menu */}
      {showActions && isAuthor && (
        <View style={styles.actionMenu}>
          <TouchableOpacity style={styles.actionItem} onPress={onEdit}>
            <Feather name="edit-2" size={16} color={colors.text} />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={onDelete}>
            <Feather name="trash-2" size={16} color={colors.error} />
            <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Mood indicator */}
      {mood && update.mood !== 'neutral' && (
        <View style={[styles.moodIndicator, { backgroundColor: moodColors[update.mood] + '20' }]}>
          <View style={[styles.moodDot, { backgroundColor: moodColors[update.mood] }]} />
          <Text style={[styles.moodText, { color: moodColors[update.mood] }]}>
            {mood.label}
          </Text>
        </View>
      )}

      {/* Content */}
      <Text style={styles.content}>{update.content}</Text>

      {/* Attachments would go here */}

      {/* Reactions */}
      <View style={styles.reactionsSection}>
        {Object.entries(reactionGroups).map(([emoji, userIds]) => (
          <TouchableOpacity
            key={emoji}
            style={[
              styles.reactionBadge,
              userIds.includes(user?._id || '') && styles.reactionBadgeActive,
            ]}
            onPress={() => handleReaction(emoji)}
          >
            <Text style={styles.reactionEmoji}>{emoji}</Text>
            <Text style={styles.reactionCount}>{userIds.length}</Text>
          </TouchableOpacity>
        ))}

        {/* Quick reaction buttons */}
        <View style={styles.quickReactions}>
          {QUICK_REACTIONS.filter((e) => !reactionGroups[e]).slice(0, 3).map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.quickReactionButton}
              onPress={() => handleReaction(emoji)}
            >
              <Text style={styles.quickReactionEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  edited: {
    fontSize: 13,
    color: colors.textMuted,
  },
  badges: {
    marginRight: 8,
  },
  menuButton: {
    padding: 4,
  },
  actionMenu: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionText: {
    fontSize: 14,
    marginLeft: 8,
    color: colors.text,
  },
  moodIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  moodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  moodText: {
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  reactionsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  reactionBadgeActive: {
    backgroundColor: colors.primaryLight + '30',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    marginLeft: 4,
    color: colors.textSecondary,
  },
  quickReactions: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  quickReactionButton: {
    padding: 4,
    marginLeft: 4,
  },
  quickReactionEmoji: {
    fontSize: 18,
    opacity: 0.5,
  },
});
