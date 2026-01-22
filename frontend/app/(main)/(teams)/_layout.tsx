import { Stack } from 'expo-router';
import { useColors } from '../../../src/hooks/useColors';

export default function TeamsLayout() {
  const colors = useColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text },
        contentStyle: { backgroundColor: colors.backgroundSecondary },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Teams',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="[teamId]"
        options={{
          title: 'Team',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: 'Create Team',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
