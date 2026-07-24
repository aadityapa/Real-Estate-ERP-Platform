import { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { getApiUrl } from "../src/config";
import { getAccessToken } from "../src/secure-token";

type LeadRow = { id: string; firstName: string; lastName?: string | null };

export default function LeadsScreen(): React.ReactElement {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          setError("Not signed in");
          return;
        }
        const res = await fetch(`${getApiUrl()}/crm/leads?page=1&limit=20`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = (await res.json()) as {
          data?: { data?: LeadRow[] } | LeadRow[];
        };
        const rows = Array.isArray(json.data)
          ? json.data
          : (json.data as { data?: LeadRow[] })?.data ?? [];
        setLeads(rows);
      } catch {
        setError("Failed to load leads");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator testID="leads-loading" />
      </View>
    );
  }

  return (
    <View style={styles.container} testID="leads-screen">
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={leads}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.muted}>No leads</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>
              {item.firstName} {item.lastName ?? ""}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  row: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  name: { fontWeight: "600", color: "#0F172A" },
  muted: { color: "#64748B", textAlign: "center", marginTop: 40 },
  error: { color: "#B91C1C", marginBottom: 8 },
});
