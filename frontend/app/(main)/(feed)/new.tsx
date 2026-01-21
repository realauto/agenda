import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../../src/constants/colors';
import { UpdateComposer } from '../../../src/components/feed/UpdateComposer';
import { Loading } from '../../../src/components/ui/Loading';
import { useFeedStore } from '../../../src/store/feedStore';
import { projectsApi } from '../../../src/api/projects';
import type { Project, UpdateCategory, UpdateMood } from '../../../src/types';

export default function NewUpdateScreen() {
  const { editId, projectId: preselectedProjectId } = useLocalSearchParams<{
    editId?: string;
    projectId?: string;
  }>();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { createUpdate, editUpdate } = useFeedStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Fetch all projects the user has access to
      const response = await projectsApi.getAll();
      setProjects(response.projects);
    } catch (error) {
      Alert.alert('Error', 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: {
    projectId: string;
    content: string;
    category: UpdateCategory;
    mood: UpdateMood;
  }) => {
    try {
      if (editId) {
        await editUpdate(editId, {
          content: data.content,
          category: data.category,
          mood: data.mood,
        });
      } else {
        await createUpdate(data);
      }
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save update');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Loading message="Loading projects..." />
      </SafeAreaView>
    );
  }

  if (projects.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Loading message="No projects available. Create a project first." />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <UpdateComposer
          projects={projects}
          selectedProjectId={preselectedProjectId}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
