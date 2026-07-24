import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { getApiUrl } from "../src/config";
import { saveTokens } from "../src/secure-token";

export default function LoginScreen(): React.ReactElement {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onLogin(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiUrl()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { accessToken?: string; refreshToken?: string };
        error?: { message?: string };
      };
      if (!res.ok || !json.data?.accessToken) {
        setError(json.error?.message ?? "Login failed");
        return;
      }
      await saveTokens(json.data.accessToken, json.data.refreshToken ?? "");
      router.replace("/leads");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container} testID="login-screen">
      <Text style={styles.title}>PropOS</Text>
      <TextInput
        testID="login-email"
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        testID="login-password"
        style={styles.input}
        secureTextEntry
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        testID="login-submit"
        style={styles.button}
        onPress={() => void onLogin()}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign in</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F8FAFC",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#0F172A",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  error: { color: "#B91C1C", marginBottom: 8 },
});
