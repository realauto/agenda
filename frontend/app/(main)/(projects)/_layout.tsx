import { Stack } from 'expo-router';
import { useColors } from '../../../src/hooks/useColors';

export default function ProjectsLayout() {
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
