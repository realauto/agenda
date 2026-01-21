import { Stack } from 'expo-router';

export default function FeedLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Feed',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: 'New Update',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
