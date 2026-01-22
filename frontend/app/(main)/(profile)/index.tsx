import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '../../../src/hooks/useColors';
import { Card } from '../../../src/components/ui/Card';
import { Avatar } from '../../../src/components/ui/Avatar';
import { Button } from '../../../src/components/ui/Button';
import { useAuthStore } from '../../../src/store/authStore';
import { useTeamStore } from '../../../src/store/teamStore';

export default function ProfileScreen() {
  const colors = useColors();
  const { user, logout } = useAuthStore();
  const { teams } = useTeamStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Avatar
              source={user.avatar}
              name={user.displayName || user.username}
              size="xlarge"
            />
            <View style={styles.profileInfo}>
              <Text style={[styles.displayName, { color: colors.text }]}>
                {user.displayName || user.username}
              </Text>
              <Text style={[styles.username, { color: colors.textSecondary }]}>@{user.username}</Text>
              <Text style={[styles.email, { color: colors.textMuted }]}>{user.email}</Text>
            </View>
          </View>

          {user.bio && <Text style={[styles.bio, { color: colors.textSecondary }]}>{user.bio}</Text>}

          <View style={[styles.profileStats, { borderTopColor: colors.borderLight }]}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.text }]}>{teams.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Teams</Text>
            </View>
          </View>
        </Card>

        {/* Menu Items */}
        <Card style={styles.menuCard}>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
            onPress={() => router.push('/(main)/(profile)/settings')}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: colors.primary + '15' }]}>
                <Feather name="settings" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Settings</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: colors.secondary + '15' }]}>
                <Feather name="bell" size={20} color={colors.secondary} />
              </View>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Notifications</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: colors.success + '15' }]}>
                <Feather name="help-circle" size={20} color={colors.success} />
              </View>
              <Text style={[styles.menuItemText, { color: colors.text }]}>Help & Support</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        <Button
          title="Logout"
          variant="outline"
          onPress={handleLogout}
          style={styles.logoutButton}
        />

        <Text style={[styles.version, { color: colors.textMuted }]}>ProjectLog v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  profileCard: {
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    marginBottom: 4,
  },
  email: {
    fontSize: 13,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  profileStats: {
    flexDirection: 'row',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  stat: {
    alignItems: 'center',
    marginRight: 32,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 13,
  },
  menuCard: {
    marginBottom: 16,
    padding: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
  },
  logoutButton: {
    marginBottom: 24,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
  },
});
