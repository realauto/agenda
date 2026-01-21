import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { CommentItem } from './CommentItem';
import { CommentInput } from './CommentInput';
import type { Comment } from '../../types';

interface CommentSectionProps {
  comments: Comment[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAddComment: (content: string) => Promise<void>;
  onEditComment: (commentId: string, content: string) => void;
  onDeleteComment: (commentId: string) => void;
}

export function CommentSection({
  comments,
  isExpanded,
  onToggleExpand,
  onAddComment,
  onEditComment,
  onDeleteComment,
}: CommentSectionProps) {
  const commentCount = comments.length;

  return (
    <View style={styles.container}>
      {/* Toggle button */}
      <TouchableOpacity style={styles.toggleButton} onPress={onToggleExpand}>
        <Feather
          name="message-circle"
          size={16}
          color={colors.textSecondary}
        />
        <Text style={styles.toggleText}>
          {commentCount === 0
            ? 'Add a comment'
            : `${commentCount} comment${commentCount === 1 ? '' : 's'}`}
        </Text>
        <Feather
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {/* Expanded content */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Comments list */}
          {comments.length > 0 && (
            <View style={styles.commentsList}>
              {comments.map((comment) => (
                <CommentItem
                  key={comment._id}
                  comment={comment}
                  onEdit={onEditComment}
                  onDelete={onDeleteComment}
                />
              ))}
            </View>
          )}

          {/* Comment input */}
          <CommentInput onSubmit={onAddComment} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 12,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  toggleText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 6,
    marginRight: 4,
  },
  expandedContent: {
    marginTop: 12,
  },
  commentsList: {
    marginBottom: 8,
  },
});
