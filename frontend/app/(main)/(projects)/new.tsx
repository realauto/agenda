import React, { useState } from 'react';
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
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../../src/constants/colors';
import { Input } from '../../../src/components/ui/Input';
import { Button } from '../../../src/components/ui/Button';
import { projectsApi } from '../../../src/api/projects';
import type { ProjectVisibility } from '../../../src/types';

const PROJECT_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981',
  '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899',
];

const VISIBILITY_OPTIONS: { value: ProjectVisibility; label: string; description: string }[] = [
  { value: 'collaborators', label: 'Collaborators', description: 'Only you and invited people' },
  { value: 'private', label: 'Private', description: 'Only you can access' },
  { value: 'public', label: 'Public', description: 'Anyone can view' },
];

export default function NewProjectScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [visibility, setVisibility] = useState<ProjectVisibility>('collaborators');
  const [tags, setTags] = useState('');
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: { name?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Project name is required';
    } else if (name.length < 2) {
      newErrors.name = 'Project name must be at least 2 characters';
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

      const response = await projectsApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        visibility,
        tags: tagList.length > 0 ? tagList : undefined,
      });

      router.replace(`/(main)/(projects)/${response.project._id}`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

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

          {/* Visibility Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Who can access</Text>
            {VISIBILITY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.visibilityOption,
                  visibility === option.value && styles.visibilityOptionActive,
                ]}
                onPress={() => setVisibility(option.value)}
              >
                <View style={styles.visibilityContent}>
                  <Text
                    style={[
                      styles.visibilityLabel,
                      visibility === option.value && styles.visibilityLabelActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={styles.visibilityDescription}>{option.description}</Text>
                </View>
                {visibility === option.value && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

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
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  visibilityOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  visibilityContent: {
    flex: 1,
  },
  visibilityLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  visibilityLabelActive: {
    color: colors.primary,
  },
  visibilityDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
