import React from 'react';
import {
  FlatList,
  RefreshControl,
  View,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useColors } from '../../hooks/useColors';
import { UpdateCard } from './UpdateCard';
import { EmptyState } from '../ui/EmptyState';
import type { Update } from '../../types';

interface FeedListProps {
  updates: Update[];
  isLoading: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
  onRefresh: () => void;
  onLoadMore: () => void;
  onReact: (updateId: string, emoji: string) => void;
  onEdit?: (update: Update) => void;
  onDelete?: (updateId: string) => void;
  onPressUpdate?: (update: Update) => void;
  onAddComment?: (updateId: string, content: string) => Promise<void>;
  onEditComment?: (updateId: string, commentId: string, content: string) => void;
  onDeleteComment?: (updateId: string, commentId: string) => void;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: string;
  onEmptyAction?: () => void;
  ListHeaderComponent?: React.ReactElement;
}

export function FeedList({
  updates,
  isLoading,
  isRefreshing,
  hasMore,
  onRefresh,
  onLoadMore,
  onReact,
  onEdit,
  onDelete,
  onPressUpdate,
  onAddComment,
  onEditComment,
  onDeleteComment,
  emptyTitle = 'No updates yet',
  emptyMessage = 'Be the first to post an update!',
  emptyAction,
  onEmptyAction,
  ListHeaderComponent,
}: FeedListProps) {
  const colors = useColors();

  const renderItem = ({ item }: { item: Update }) => (
    <UpdateCard
      update={item}
      onReact={(emoji) => onReact(item._id, emoji)}
      onEdit={onEdit ? () => onEdit(item) : undefined}
      onDelete={onDelete ? () => onDelete(item._id) : undefined}
      onPress={onPressUpdate ? () => onPressUpdate(item) : undefined}
      onAddComment={onAddComment ? (content) => onAddComment(item._id, content) : undefined}
      onEditComment={onEditComment ? (commentId, content) => onEditComment(item._id, commentId, content) : undefined}
      onDeleteComment={onDeleteComment ? (commentId) => onDeleteComment(item._id, commentId) : undefined}
    />
  );

  const renderFooter = () => {
    if (!hasMore || updates.length === 0) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;

    return (
      <EmptyState
        icon="message-circle"
        title={emptyTitle}
        message={emptyMessage}
        actionLabel={emptyAction}
        onAction={onEmptyAction}
      />
    );
  };

  if (isLoading && updates.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={updates}
      renderItem={renderItem}
      keyExtractor={(item) => item._id}
      contentContainerStyle={updates.length === 0 ? styles.emptyContainer : styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      ListHeaderComponent={ListHeaderComponent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
