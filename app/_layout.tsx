// app/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { registerGlobals } from '@livekit/react-native';
import * as Sentry from '@sentry/react-native';
import { captureConsoleIntegration } from "@sentry/integrations";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.EXPO_PUBLIC_SENTRY_ENV,
  integrations: [
    captureConsoleIntegration({ levels: ["warn", "error"] }),
  ]

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // enableSpotlight: __DEV__,
});

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
