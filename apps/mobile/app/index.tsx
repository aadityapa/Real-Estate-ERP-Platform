import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Link, router } from "expo-router";

const modules = [
  { title: "CRM Leads", href: "/leads" },
  { title: "Site Visits", href: "/site-visits" },
  { title: "DPR Submit", href: "/dpr" },
];

export default function HomeScreen(): React.ReactElement {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>PropOS Mobile</Text>
      <Text style={styles.subtitle}>Field sales & site operations</Text>
      <Pressable
        testID="go-login"
        style={styles.card}
        onPress={() => router.push("/login")}
      >
        <Text style={styles.cardTitle}>Sign in</Text>
      </Pressable>
      {modules.map((m) => (
        <Link key={m.href} href={m.href} style={styles.card}>
          <Text style={styles.cardTitle}>{m.title}</Text>
        </Link>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", padding: 20 },
  title: { fontSize: 28, fontWeight: "800", color: "#0F172A", marginTop: 40 },
  subtitle: { fontSize: 14, color: "#64748B", marginBottom: 24 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#0F172A" },
});
