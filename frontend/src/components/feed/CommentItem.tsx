import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { Avatar } from '../ui/Avatar';
import type { Comment } from '../../types';
import { useAuthStore } from '../../store/authStore';

interface CommentItemProps {
  comment: Comment;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
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

export function CommentItem({ comment, onEdit, onDelete }: CommentItemProps) {
  const colors = useColors();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showActions, setShowActions] = useState(false);
  const user = useAuthStore((state) => state.user);
  const isAuthor = user?._id === comment.authorId;

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== comment.content) {
      onEdit?.(comment._id, editContent.trim());
    }
    setIsEditing(false);
    setShowActions(false);
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete?.(comment._id);
    setShowActions(false);
  };

  return (
    <View style={styles.container}>
      <Avatar
        source={comment.author?.avatar}
        name={comment.author?.displayName || comment.author?.username}
        size="small"
      />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.authorName, { color: colors.text }]}>
            {comment.author?.displayName || comment.author?.username || 'Unknown'}
          </Text>
          <Text style={[styles.time, { color: colors.textMuted }]}>{formatRelativeTime(comment.createdAt)}</Text>
          {comment.isEdited && <Text style={[styles.edited, { color: colors.textMuted }]}> (edited)</Text>}
          {isAuthor && !isEditing && (
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setShowActions(!showActions)}
            >
              <Feather name="more-horizontal" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {showActions && isAuthor && (
          <View style={[styles.actionMenu, { backgroundColor: colors.backgroundSecondary }]}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                setIsEditing(true);
                setShowActions(false);
              }}
            >
              <Feather name="edit-2" size={14} color={colors.text} />
              <Text style={[styles.actionText, { color: colors.text }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={handleDelete}>
              <Feather name="trash-2" size={14} color={colors.error} />
              <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}

        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={[styles.editInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              value={editContent}
              onChangeText={setEditContent}
              multiline
              autoFocus
            />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.editButton} onPress={handleCancelEdit}>
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editButton, styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveEdit}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={[styles.commentText, { color: colors.text }]}>{comment.content}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  content: {
    flex: 1,
    marginLeft: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '600',
  },
  time: {
    fontSize: 12,
    marginLeft: 8,
  },
  edited: {
    fontSize: 12,
  },
  menuButton: {
    marginLeft: 'auto',
    padding: 4,
  },
  actionMenu: {
    flexDirection: 'row',
    borderRadius: 6,
    padding: 4,
    marginBottom: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionText: {
    fontSize: 12,
    marginLeft: 4,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  editContainer: {
    marginTop: 4,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    minHeight: 60,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  editButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  cancelButtonText: {
    fontSize: 13,
  },
  saveButton: {},
  saveButtonText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});
