import { Stack } from 'expo-router';
import { useColors } from '../../../src/hooks/useColors';

export default function MembersLayout() {
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
          title: 'Members',
          headerShown: true,
        }}
      />
    </Stack>
  );
}
