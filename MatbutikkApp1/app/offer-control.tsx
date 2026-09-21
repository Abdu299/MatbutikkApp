import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OfferControlScreen() {
  function handleControl() {
    Alert.alert(
      "App kontrollert",
      "Kunden har Matbutikk-appen og kan benytte seg av tilbudet.",
      [{ text: "OK" }]
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.back()}
          >
            <Ionicons
              name="chevron-back-outline"
              size={26}
              color="#202020"
            />
          </Pressable>

          <Text style={styles.headerTitle}>Tilbudskontroll</Text>

          <View style={styles.headerSpace} />
        </View>

        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.badge}>
            <Ionicons
              name="phone-portrait-outline"
              size={17}
              color="#1F7A3D"
            />

            <Text style={styles.badgeText}>Kun for appbrukere</Text>
          </View>

          <Text style={styles.title}>Vis denne siden i kassen</Text>

          <Text style={styles.description}>
            Denne siden viser at du har Matbutikk-appen og kan benytte deg av
            tilbud som er tilgjengelige for appbrukere.
          </Text>

          <View style={styles.imageCard}>
            <Image
              source={require("../assets/images/icon.png")}
              style={styles.image}
              resizeMode="contain"
            />
          </View>

          <View style={styles.informationBox}>
            <Ionicons
              name="information-circle-outline"
              size={23}
              color="#1F7A3D"
            />

            <Text style={styles.informationText}>
              Vis denne skjermen til den ansatte før du betaler for å få
              app-tilbudet.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.controlButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleControl}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={24}
              color="#FFFFFF"
            />

            <Text style={styles.controlButtonText}>Kontroll</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7F5",
  },

  header: {
    height: 58,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E6E2",
    backgroundColor: "#FFFFFF",
  },

  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "900",
    color: "#202020",
  },

  headerSpace: {
    width: 42,
  },

  container: {
    padding: 20,
    paddingBottom: 50,
  },

  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#E3EDE5",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  badgeText: {
    color: "#1F7A3D",
    fontSize: 13,
    fontWeight: "800",
  },

  title: {
    marginTop: 22,
    fontSize: 30,
    fontWeight: "900",
    color: "#171717",
  },

  description: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 23,
    color: "#686868",
  },

  imageCard: {
    height: 280,
    marginTop: 25,
    padding: 35,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DDE3DE",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  informationBox: {
    marginTop: 18,
    padding: 15,
    borderRadius: 14,
    backgroundColor: "#E7F4EA",
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  informationText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: "#205C32",
  },

  controlButton: {
    minHeight: 58,
    marginTop: 24,
    borderRadius: 14,
    backgroundColor: "#1F7A3D",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  controlButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },

  buttonPressed: {
    opacity: 0.72,
  },
});