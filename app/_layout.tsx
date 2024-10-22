// app/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { registerGlobals } from '@livekit/react-native';

registerGlobals()

const RootLayout: React.FC = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(home)" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
};

export default RootLayout;
