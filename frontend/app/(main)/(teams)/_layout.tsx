import { Stack } from 'expo-router';

export default function TeamsLayout() {
  return (
    <Stack>
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
