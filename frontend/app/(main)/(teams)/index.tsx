import React from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../../src/constants/colors';
import { TeamCard } from '../../../src/components/team/TeamCard';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { Loading } from '../../../src/components/ui/Loading';
import { useTeams } from '../../../src/hooks/useTeam';

export default function TeamsScreen() {
  const { teams, isLoading, fetchTeams } = useTeams();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTeams();
    setIsRefreshing(false);
  };

  if (isLoading && teams.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <Loading message="Loading teams..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <FlatList
        data={teams}
        renderItem={({ item }) => (
          <TeamCard
            team={item}
            onPress={() => router.push(`/(main)/(teams)/${item._id}`)}
          />
        )}
        keyExtractor={(item) => item._id}
        contentContainerStyle={teams.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="users"
            title="No teams yet"
            message="Create a team to start collaborating with others"
            actionLabel="Create Team"
            onAction={() => router.push('/(main)/(teams)/new')}
          />
        }
      />

      {teams.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/(main)/(teams)/new')}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  list: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flexGrow: 1,
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
});
