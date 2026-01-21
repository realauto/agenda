import { Stack } from 'expo-router';

export default function ProjectsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Projects',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="[projectId]"
        options={{
          title: 'Project',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: 'Create Project',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
