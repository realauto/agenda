import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { categories, moods } from '../../constants/categories';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import type { UpdateCategory, UpdateMood, Project } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { config } from '../../constants/config';

interface UpdateComposerProps {
  projects: Project[];
  selectedProjectId?: string;
  onSubmit: (data: {
    projectId: string;
    content: string;
    category: UpdateCategory;
    mood: UpdateMood;
  }) => Promise<void>;
  onCancel?: () => void;
}

export function UpdateComposer({
  projects,
  selectedProjectId,
  onSubmit,
  onCancel,
}: UpdateComposerProps) {
  const colors = useColors();
  const user = useAuthStore((state) => state.user);
  const [content, setContent] = useState('');
  const [projectId, setProjectId] = useState(selectedProjectId || '');
  const [category, setCategory] = useState<UpdateCategory>('general');
  const [mood, setMood] = useState<UpdateMood>('neutral');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);

  const selectedProject = projects.find((p) => p._id === projectId);
  const canSubmit = content.trim().length > 0 && projectId;

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ projectId, content: content.trim(), category, mood });
      setContent('');
      setCategory('general');
      setMood('neutral');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Avatar
          source={user?.avatar}
          name={user?.displayName || user?.username}
          size="medium"
        />
        <View style={styles.headerInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>
            {user?.displayName || user?.username}
          </Text>
          <TouchableOpacity
            style={styles.projectSelector}
            onPress={() => setShowProjectPicker(!showProjectPicker)}
          >
            <Text style={[styles.projectText, { color: colors.textSecondary }]}>
              {selectedProject ? selectedProject.name : 'Select project'}
            </Text>
            <Feather
              name={showProjectPicker ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
        {onCancel && (
          <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
            <Feather name="x" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Project Picker */}
      {showProjectPicker && (
        <ScrollView style={styles.projectList} horizontal showsHorizontalScrollIndicator={false}>
          {projects.map((project) => (
            <TouchableOpacity
              key={project._id}
              style={[
                styles.projectItem,
                { borderColor: colors.border },
                projectId === project._id && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
              ]}
              onPress={() => {
                setProjectId(project._id);
                setShowProjectPicker(false);
              }}
            >
              {project.color && (
                <View style={[styles.projectDot, { backgroundColor: project.color }]} />
              )}
              <Text
                style={[
                  styles.projectItemText,
                  { color: colors.textSecondary },
                  projectId === project._id && { color: colors.primary, fontWeight: '500' },
                ]}
              >
                {project.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Content Input */}
      <TextInput
        style={[styles.input, { color: colors.text }]}
        placeholder="What's the latest on your project?"
        placeholderTextColor={colors.textMuted}
        multiline
        value={content}
        onChangeText={setContent}
        maxLength={config.maxContentLength}
      />

      {/* Character count */}
      <Text style={[styles.charCount, { color: colors.textMuted }]}>
        {content.length}/{config.maxContentLength}
      </Text>

      {/* Category Picker */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionList}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            style={[
              styles.optionItem,
              { borderColor: colors.border },
              category === cat.value && { backgroundColor: cat.color + '20', borderColor: cat.color },
            ]}
            onPress={() => setCategory(cat.value)}
          >
            <Feather
              name={cat.icon as any}
              size={16}
              color={category === cat.value ? cat.color : colors.textSecondary}
            />
            <Text
              style={[
                styles.optionText,
                { color: colors.textSecondary },
                category === cat.value && { color: cat.color },
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Mood Picker */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Mood</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionList}>
        {moods.map((m) => (
          <TouchableOpacity
            key={m.value}
            style={[
              styles.optionItem,
              { borderColor: colors.border },
              mood === m.value && { backgroundColor: m.color + '20', borderColor: m.color },
            ]}
            onPress={() => setMood(m.value)}
          >
            <Feather
              name={m.icon as any}
              size={16}
              color={mood === m.value ? m.color : colors.textSecondary}
            />
            <Text
              style={[
                styles.optionText,
                { color: colors.textSecondary },
                mood === m.value && { color: m.color },
              ]}
            >
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Submit Button */}
      <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
        <Button
          title="Post Update"
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={isSubmitting}
          style={styles.submitButton}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
  },
  projectSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  projectText: {
    fontSize: 13,
    marginRight: 4,
  },
  closeButton: {
    padding: 4,
  },
  projectList: {
    marginBottom: 12,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  projectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  projectItemText: {
    fontSize: 13,
  },
  input: {
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  optionList: {
    marginBottom: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  optionText: {
    fontSize: 13,
    marginLeft: 6,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 16,
  },
  submitButton: {
    width: '100%',
  },
});
