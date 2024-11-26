// app/_layout.tsx

import { SessionProvider } from "@/context/SessionContext";
import { registerGlobals } from "@livekit/react-native";
import { captureConsoleIntegration } from "@sentry/integrations";
import * as Sentry from "@sentry/react-native";
import { Stack } from "expo-router";
import React from "react";
import { AppContextProvider } from "../context";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.EXPO_PUBLIC_SENTRY_ENV,
  integrations: [captureConsoleIntegration({ levels: ["warn", "error"] })],
  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // enableSpotlight: __DEV__,
});

registerGlobals();

const RootLayout: React.FC = () => {
  return (
    <SessionProvider>
      <AppContextProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(home)" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ title: "Settings" }} />
        </Stack>
      </AppContextProvider>
    </SessionProvider>
  );
};

export default RootLayout;
