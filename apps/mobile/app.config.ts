import type { ExpoConfig, ConfigContext } from "expo/config";

const APP_ENV = process.env.APP_ENV ?? "development";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "PropOS",
  slug: "propos",
  scheme: "propos",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#0F172A",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.nexovo.propos",
    infoPlist: {
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: APP_ENV === "development",
      },
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0F172A",
    },
    package: "com.nexovo.propos",
  },
  updates: {
    url: "https://u.expo.dev/REPLACE_EAS_PROJECT_ID",
    fallbackToCacheTimeout: 0,
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  extra: {
    eas: {
      projectId: "REPLACE_EAS_PROJECT_ID",
    },
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001/api/v1",
    appEnv: APP_ENV,
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? "",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "@sentry/react-native/expo",
      {
        organization: process.env.SENTRY_ORG ?? "nexovo",
        project: process.env.SENTRY_PROJECT ?? "propos-mobile",
      },
    ],
  ],
});
