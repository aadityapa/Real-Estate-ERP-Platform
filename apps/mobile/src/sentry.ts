import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";
import { getAppEnv } from "./config";

export function initSentry(): void {
  const dsn = (Constants.expoConfig?.extra?.["sentryDsn"] as string) || "";
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: getAppEnv(),
    tracesSampleRate: getAppEnv() === "production" ? 0.2 : 1.0,
    sendDefaultPii: false,
  });
}
