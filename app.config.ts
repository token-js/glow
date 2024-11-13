import { ExpoConfig, ConfigContext } from 'expo/config';

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
    backgroundColor: "#ffffff"
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.glowhealth.app",
    // usesAppleSignIn: true,
    usesAppleSignIn: false,
    infoPlist: {
      UIBackgroundModes: [
        "audio", "fetch", "voip"
      ]
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    },
    package: "com.glowhealth.app"
  },
  web: {
    favicon: "./assets/favicon.png",
    bundler: "metro",
    output: "server"
  },
  plugins: [
    [
      "expo-dev-launcher",
      {
        launchMode: "most-recent"
      }
    ],
    [
      "@react-native-google-signin/google-signin",
      {
        iosUrlScheme: "com.googleusercontent.apps.118244602240-hj3ukvu2rn64cvnop7of44b0psuackki"
      }
    ],
    "expo-router",
    "@livekit/react-native-expo-plugin",
    "@config-plugins/react-native-webrtc",
    // "expo-apple-authentication"
  ],
  extra: {
    eas: {
      projectId: "eabffbc4-2fb2-4d8a-810a-4fcf6e702c20"
    }
  }
});
