import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { categoryColors, moodColors } from '../../constants/colors';
import { getCategoryByValue, getMoodByValue } from '../../constants/categories';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { CommentSection } from './CommentSection';
import type { Update } from '../../types';
import { useAuthStore } from '../../store/authStore';

interface UpdateCardProps {
  update: Update;
  onReact?: (emoji: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPress?: () => void;
  onAddComment?: (content: string) => Promise<void>;
  onEditComment?: (commentId: string, content: string) => void;
  onDeleteComment?: (commentId: string) => void;
}

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

const QUICK_REACTIONS = ['like', 'love', 'celebrate'];

export function UpdateCard({
  update,
  onReact,
  onEdit,
  onDelete,
  onPress,
  onAddComment,
  onEditComment,
  onDeleteComment,
}: UpdateCardProps) {
  const colors = useColors();
  const [showActions, setShowActions] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const user = useAuthStore((state) => state.user);
  const isAuthor = user?._id === update.authorId;

  // Reaction icons using Feather icon names
  const REACTION_ICONS: Record<string, { icon: keyof typeof Feather.glyphMap; color: string }> = {
    like: { icon: 'thumbs-up', color: colors.primary },
    love: { icon: 'heart', color: '#EF4444' },
    celebrate: { icon: 'award', color: '#F59E0B' },
    rocket: { icon: 'zap', color: '#8B5CF6' },
    eyes: { icon: 'eye', color: colors.textSecondary },
  };

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
          <Text style={[styles.authorName, { color: colors.text }]}>
            {update.author?.displayName || update.author?.username || 'Unknown'}
          </Text>
          <View style={styles.meta}>
            <Text style={[styles.time, { color: colors.textSecondary }]}>{formatRelativeTime(update.createdAt)}</Text>
            {update.isEdited && <Text style={[styles.edited, { color: colors.textMuted }]}> · edited</Text>}
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
        <View style={[styles.actionMenu, { backgroundColor: colors.backgroundSecondary }]}>
          <TouchableOpacity style={styles.actionItem} onPress={onEdit}>
            <Feather name="edit-2" size={16} color={colors.text} />
            <Text style={[styles.actionText, { color: colors.text }]}>Edit</Text>
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
      <Text style={[styles.content, { color: colors.text }]}>{update.content}</Text>

      {/* Attachments would go here */}

      {/* Reactions */}
      <View style={[styles.reactionsSection, { borderTopColor: colors.borderLight }]}>
        {Object.entries(reactionGroups).map(([reactionKey, userIds]) => {
          const reactionConfig = REACTION_ICONS[reactionKey];
          if (!reactionConfig) return null;
          const isActive = userIds.includes(user?._id || '');
          return (
            <TouchableOpacity
              key={reactionKey}
              style={[
                styles.reactionBadge,
                { backgroundColor: colors.backgroundSecondary },
                isActive && { backgroundColor: colors.primaryLight + '20', borderWidth: 1, borderColor: colors.primary },
              ]}
              onPress={() => handleReaction(reactionKey)}
            >
              <Feather
                name={reactionConfig.icon}
                size={14}
                color={isActive ? reactionConfig.color : colors.textSecondary}
              />
              <Text style={[styles.reactionCount, { color: colors.textSecondary }, isActive && { color: reactionConfig.color }]}>
                {userIds.length}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Quick reaction buttons */}
        <View style={styles.quickReactions}>
          {QUICK_REACTIONS.filter((key) => !reactionGroups[key]).map((reactionKey) => {
            const reactionConfig = REACTION_ICONS[reactionKey];
            return (
              <TouchableOpacity
                key={reactionKey}
                style={styles.quickReactionButton}
                onPress={() => handleReaction(reactionKey)}
              >
                <Feather
                  name={reactionConfig.icon}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Comments */}
      <CommentSection
        comments={update.comments || []}
        isExpanded={commentsExpanded}
        onToggleExpand={() => setCommentsExpanded(!commentsExpanded)}
        onAddComment={onAddComment || (async () => {})}
        onEditComment={onEditComment || (() => {})}
        onDeleteComment={onDeleteComment || (() => {})}
      />
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
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    fontSize: 13,
  },
  edited: {
    fontSize: 13,
  },
  badges: {
    marginRight: 8,
  },
  menuButton: {
    padding: 4,
  },
  actionMenu: {
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
  },
  reactionsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  reactionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  reactionCount: {
    fontSize: 12,
    marginLeft: 4,
  },
  quickReactions: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  quickReactionButton: {
    padding: 6,
    marginLeft: 4,
  },
});
