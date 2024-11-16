import { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Glow",
  slug: "Glow",
  scheme: "glow",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.glowhealth.companion",
    usesAppleSignIn: true,
    infoPlist: {
      UIBackgroundModes: ["audio", "fetch", "voip"],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: "com.glowhealth.companion",
  },
  web: {
    favicon: "./assets/favicon.png",
    bundler: "metro",
    output: "server",
  },
  plugins: [
    [
      "expo-dev-launcher",
      {
        launchMode: "most-recent",
      },
    ],
    [
      "@react-native-google-signin/google-signin",
      {
        iosUrlScheme:
          "com.googleusercontent.apps.118244602240-hj3ukvu2rn64cvnop7of44b0psuackki",
      },
    ],
    [
      "@sentry/react-native/expo",
      {
        url: "https://sentry.io/",
        project: "javascript-nextjs",
        organization: "glow-7f",
      },
    ],
    "expo-router",
    "@livekit/react-native-expo-plugin",
    "@config-plugins/react-native-webrtc",
    "expo-apple-authentication",
    "expo-audio",
  ],
  extra: {
    eas: {
      projectId: "313b0e1d-611b-4f97-b2cb-a2ffdaa0cfd2",
    },
  },
});
