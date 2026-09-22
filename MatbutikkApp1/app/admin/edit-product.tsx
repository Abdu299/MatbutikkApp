import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { db } from "../../firebase/firebaseConfig";

export default function AdminScreen() {
  async function testFirebase() {
    try {
      await addDoc(collection(db, "firebaseTests"), {
        message: "Firebase fungerer",
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        "Firebase fungerer",
        "Testdata ble lagret ."
      );
    } catch (error) {
      console.error("Firebase-feil:", error);

      Alert.alert(
        "Firebase-feil",
        "Kunne ikke lagre testdata. Se terminalen for feilmeldingen."
      );
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.adminBadge}>
          <Ionicons
            name="shield-checkmark-outline"
            size={18}
            color="#5A1B6F"
          />

          <Text style={styles.adminBadgeText}>Adminpanel</Text>
        </View>

        <Text style={styles.title}>Administrasjon</Text>

        <Text style={styles.subtitle}>
          Administrer tilbud og nye produkter i appen.
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.testButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={testFirebase}
      >
        <Ionicons
          name="cloud-done-outline"
          size={22}
          color="#FFFFFF"
        />

        <Text style={styles.testButtonText}>Test Firebase</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Opprett innhold</Text>

      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
        onPress={() => router.push("/admin/add-offer")}
      >
        <View style={[styles.iconBox, styles.offerIconBox]}>
          <Ionicons
            name="pricetag-outline"
            size={28}
            color="#5A1B6F"
          />
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Legg til tilbud</Text>

          <Text style={styles.cardDescription}>
            Opprett et nytt tilbud med bilde, pris og varighet.
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={23}
          color="#777777"
        />
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
        onPress={() => router.push("/admin/add-product")}
      >
        <View style={[styles.iconBox, styles.productIconBox]}>
          <Ionicons
            name="cube-outline"
            size={28}
            color="#3F245E"
          />
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Legg til produkt</Text>

          <Text style={styles.cardDescription}>
            Publiser et nytt produkt på produktsiden.
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={23}
          color="#777777"
        />
      </Pressable>

      <Text style={styles.sectionTitle}>Administrer innhold</Text>

      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
        onPress={() => router.push("/admin/manage-offers")}
      >
        <View style={[styles.iconBox, styles.manageOfferIconBox]}>
          <Ionicons
            name="list-outline"
            size={28}
            color="#8A5A00"
          />
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Administrer tilbud</Text>

          <Text style={styles.cardDescription}>
            Se, skjul, aktiver og slett publiserte tilbud.
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={23}
          color="#777777"
        />
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
        onPress={() => router.push("/admin/manage-products")}
      >
        <View style={[styles.iconBox, styles.manageProductIconBox]}>
          <Ionicons
            name="settings-outline"
            size={28}
            color="#6A3FA0"
          />
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Administrer produkter</Text>

          <Text style={styles.cardDescription}>
            Se, skjul, aktiver og slett publiserte produkter.
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={23}
          color="#777777"
        />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F4EE",
  },

  container: {
    padding: 20,
    paddingTop: 28,
    paddingBottom: 60,
  },

  header: {
    marginBottom: 22,
  },

  adminBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#E9E0EF",
  },

  adminBadgeText: {
    color: "#5A1B6F",
    fontSize: 13,
    fontWeight: "800",
  },

  title: {
    marginTop: 16,
    fontSize: 30,
    fontWeight: "900",
    color: "#26252A",
  },

  subtitle: {
    marginTop: 7,
    fontSize: 15,
    lineHeight: 22,
    color: "#666666",
  },

  testButton: {
    minHeight: 54,
    marginBottom: 28,
    borderRadius: 13,
    backgroundColor: "#26252A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  testButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  sectionTitle: {
    marginBottom: 12,
    fontSize: 17,
    fontWeight: "900",
    color: "#26252A",
  },

  card: {
    minHeight: 108,
    marginBottom: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5DED5",
  },

  cardPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },

  iconBox: {
    width: 54,
    height: 54,
    marginRight: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  offerIconBox: {
    backgroundColor: "#E9E0EF",
  },

  productIconBox: {
    backgroundColor: "#EEE7F3",
  },

  manageOfferIconBox: {
    backgroundColor: "#FFF1D6",
  },

  manageProductIconBox: {
    backgroundColor: "#F0E8FA",
  },

  cardContent: {
    flex: 1,
    paddingRight: 10,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#26252A",
  },

  cardDescription: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: "#707070",
  },

  buttonPressed: {
    opacity: 0.75,
  },
});