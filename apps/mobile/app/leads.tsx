import { View, Text, StyleSheet } from "react-native";

export default function LeadsScreen(): React.ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Leads — syncs with PropOS API</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC" },
  text: { color: "#64748B" },
});
