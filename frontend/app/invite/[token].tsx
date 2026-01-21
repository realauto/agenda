import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../src/constants/colors';
import { Card } from '../../src/components/ui/Card';
import { Avatar } from '../../src/components/ui/Avatar';
import { Button } from '../../src/components/ui/Button';
import { Loading } from '../../src/components/ui/Loading';
import { invitesApi } from '../../src/api/invites';
import { useAuthStore } from '../../src/store/authStore';
import { getRoleByValue } from '../../src/constants/roles';
import type { Invite } from '../../src/types';

export default function AcceptInviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { isAuthenticated } = useAuthStore();

  const [invite, setInvite] = useState<Partial<Invite> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvite();
  }, [token]);

  const loadInvite = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await invitesApi.getByToken(token);
      setInvite(response.invite);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load invite');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      router.push(`/(auth)/login?returnUrl=/invite/${token}`);
      return;
    }

    setIsAccepting(true);
    try {
      const response = await invitesApi.accept(token);
      Alert.alert('Success', 'You have joined the team!', [
        {
          text: 'OK',
          onPress: () => router.replace(`/(main)/(teams)/${response.team._id}`),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to accept invite');
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Loading message="Loading invite..." />
      </SafeAreaView>
    );
  }

  if (error || !invite) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Card style={styles.card}>
            <Text style={styles.errorTitle}>Invalid Invite</Text>
            <Text style={styles.errorMessage}>
              {error || 'This invite link is invalid or has expired.'}
            </Text>
            <Button
              title="Go Home"
              onPress={() => router.replace('/')}
              style={styles.button}
            />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  const role = getRoleByValue(invite.role!);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Avatar
            source={invite.team?.avatar}
            name={invite.team?.name}
            size="xlarge"
            style={styles.avatar}
          />

          <Text style={styles.title}>You're Invited!</Text>

          <Text style={styles.teamName}>{invite.team?.name}</Text>

          <View style={styles.roleContainer}>
            <Text style={styles.roleLabel}>You'll join as</Text>
            <Text style={styles.roleName}>{role?.label || invite.role}</Text>
          </View>

          <Text style={styles.description}>
            Accept this invitation to collaborate with the team.
          </Text>

          <Button
            title={isAuthenticated ? 'Accept Invite' : 'Sign In to Accept'}
            onPress={handleAccept}
            loading={isAccepting}
            style={styles.button}
          />

          <Button
            title="Decline"
            variant="ghost"
            onPress={() => router.back()}
            style={styles.declineButton}
          />
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    alignItems: 'center',
    padding: 32,
  },
  avatar: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  teamName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 16,
  },
  roleContainer: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  roleLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  roleName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  button: {
    width: '100%',
    marginBottom: 12,
  },
  declineButton: {
    width: '100%',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.error,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
});
