import React from 'react';
import { StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '../../../src/hooks/useColors';
import { FeedList } from '../../../src/components/feed/FeedList';
import { CategoryFilter } from '../../../src/components/feed/CategoryFilter';
import { useFeed } from '../../../src/hooks/useFeed';
import type { Update } from '../../../src/types';

export default function FeedScreen() {
  const colors = useColors();
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
  } = useFeed();

  const handleReact = async (updateId: string, emoji: string) => {
    const update = updates.find((u) => u._id === updateId);
    if (!update) return;

    const existingReaction = update.reactions.find(
      (r) => r.emoji === emoji && r.userId === update.authorId
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

  const handleEdit = (update: Update) => {
    // Navigate to edit screen
    router.push(`/(main)/(feed)/new?editId=${update._id}`);
  };

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
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAddComment={addComment}
        onEditComment={editComment}
        onDeleteComment={deleteComment}
        emptyTitle="Your feed is empty"
        emptyMessage="Join a team and follow projects to see updates here"
        ListHeaderComponent={
          <CategoryFilter selected={categoryFilter} onChange={setCategoryFilter} />
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/(main)/(feed)/new')}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});
