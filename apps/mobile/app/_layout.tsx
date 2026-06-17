import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout(): React.ReactElement {
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
