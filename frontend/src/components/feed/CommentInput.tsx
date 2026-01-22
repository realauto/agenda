import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '../../store/authStore';

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>;
  placeholder?: string;
}

export function CommentInput({ onSubmit, placeholder = 'Write a comment...' }: CommentInputProps) {
  const colors = useColors();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const user = useAuthStore((state) => state.user);

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Avatar
        source={user?.avatar}
        name={user?.displayName || user?.username}
        size="small"
      />
      <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={content}
          onChangeText={setContent}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={2000}
          editable={!isSubmitting}
        />
        <TouchableOpacity
          style={[styles.submitButton, (!content.trim() || isSubmitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!content.trim() || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Feather
              name="send"
              size={18}
              color={content.trim() ? colors.primary : colors.textMuted}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginLeft: 10,
    borderWidth: 1,
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontSize: 14,
    maxHeight: 100,
    paddingVertical: 6,
  },
  submitButton: {
    padding: 8,
    marginLeft: 4,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
});
