import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { initSentry } from "../src/sentry";

export default function RootLayout(): React.ReactElement {
  useEffect(() => {
    initSentry();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0F172A" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "700" },
        }}
      />
    </>
  );
}
