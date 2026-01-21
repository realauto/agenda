import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../../src/constants/colors';
import { Input } from '../../../src/components/ui/Input';
import { Button } from '../../../src/components/ui/Button';
import { Loading } from '../../../src/components/ui/Loading';
import { useTeamStore } from '../../../src/store/teamStore';
import { projectsApi } from '../../../src/api/projects';
import type { Team } from '../../../src/types';

const PROJECT_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981',
  '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
];

export default function NewProjectScreen() {
  const { teamId: preselectedTeamId } = useLocalSearchParams<{ teamId?: string }>();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState(preselectedTeamId || '');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [tags, setTags] = useState('');
  const [errors, setErrors] = useState<{ name?: string; team?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { teams, fetchTeams, isLoading } = useTeamStore();

  useEffect(() => {
    fetchTeams();
  }, []);

  const validate = (): boolean => {
    const newErrors: { name?: string; team?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Project name is required';
    } else if (name.length < 2) {
      newErrors.name = 'Project name must be at least 2 characters';
    }

    if (!selectedTeamId) {
      newErrors.team = 'Please select a team';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const response = await projectsApi.create(selectedTeamId, {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        tags: tagList.length > 0 ? tagList : undefined,
      });

      router.replace(`/(main)/(projects)/${response.project._id}`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && teams.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Loading message="Loading teams..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Team Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Team</Text>
            {errors.team && <Text style={styles.error}>{errors.team}</Text>}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.teamList}
            >
              {teams.map((team) => (
                <TouchableOpacity
                  key={team._id}
                  style={[
                    styles.teamOption,
                    selectedTeamId === team._id && styles.teamOptionActive,
                  ]}
                  onPress={() => setSelectedTeamId(team._id)}
                >
                  <Text
                    style={[
                      styles.teamOptionText,
                      selectedTeamId === team._id && styles.teamOptionTextActive,
                    ]}
                  >
                    {team.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <Input
            label="Project Name"
            placeholder="Enter project name"
            value={name}
            onChangeText={setName}
            error={errors.name}
          />

          <Input
            label="Description (optional)"
            placeholder="What is this project about?"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          {/* Color Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Color</Text>
            <View style={styles.colorList}>
              {PROJECT_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorOption,
                    { backgroundColor: c },
                    color === c && styles.colorOptionActive,
                  ]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>
          </View>

          <Input
            label="Tags (optional)"
            placeholder="Enter tags separated by commas"
            value={tags}
            onChangeText={setTags}
          />

          <View style={styles.actions}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => router.back()}
              style={styles.cancelButton}
            />
            <Button
              title="Create Project"
              onPress={handleCreate}
              loading={isSubmitting}
              style={styles.createButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  error: {
    fontSize: 12,
    color: colors.error,
    marginBottom: 4,
  },
  teamList: {
    marginBottom: 8,
  },
  teamOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  teamOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  teamOptionText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  teamOptionTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  colorList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    marginBottom: 8,
  },
  colorOptionActive: {
    borderWidth: 3,
    borderColor: colors.text,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  createButton: {
    flex: 1,
    marginLeft: 8,
  },
});
