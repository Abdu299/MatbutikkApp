import { Ionicons } from "@expo/vector-icons";
import {
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { router, Stack } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import { auth, db } from "../firebase/firebaseConfig";

export default function DeleteAccountScreen() {
  const {
    user,
    isAdmin,
    isAuthenticated,
    isLoading,
  } = useAuth();

  const [password, setPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  function showMessage(title: string, message: string) {
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined"
    ) {
      window.alert(`${title}\n\n${message}`);
      return;
    }

    Alert.alert(title, message);
  }

  function showSuccessAndReturn() {
    const title = "Konto slettet";
    const message =
      "Kontoen og personopplysningene dine er slettet.";

    if (
      Platform.OS === "web" &&
      typeof window !== "undefined"
    ) {
      window.alert(`${title}\n\n${message}`);

      router.replace("/(tabs)/profile");
      return;
    }

    Alert.alert(title, message, [
      {
        text: "OK",
        onPress: () =>
          router.replace("/(tabs)/profile"),
      },
    ]);
  }

  async function performDelete() {
    if (!user || !user.email) {
      showMessage(
        "Ikke innlogget",
        "Du må være innlogget for å slette kontoen."
      );
      return;
    }

    if (isAdmin) {
      showMessage(
        "Kan ikke slette adminkonto",
        "Adminkontoen kan ikke slettes fra appen."
      );
      return;
    }

    if (!password) {
      showMessage(
        "Skriv inn passord",
        "Du må bekrefte passordet ditt."
      );
      return;
    }

    try {
      setIsDeleting(true);

      const credential = EmailAuthProvider.credential(
        user.email,
        password
      );

      await reauthenticateWithCredential(
        user,
        credential
      );

      const userReference = doc(
        db,
        "users",
        user.uid
      );

      const profileSnapshot =
        await getDoc(userReference);

      await deleteDoc(userReference);

      try {
        await deleteUser(user);
      } catch (deleteError) {
        // Hvis sletting i Firebase Authentication feiler,
        // prøver vi å gjenopprette Firestore-profilen.
        if (profileSnapshot.exists()) {
          try {
            await setDoc(
              userReference,
              profileSnapshot.data()
            );
          } catch (restoreError) {
            console.error(
              "Kunne ikke gjenopprette brukerprofilen:",
              restoreError
            );
          }
        }

        throw deleteError;
      }

      setPassword("");
      showSuccessAndReturn();
    } catch (error: any) {
      console.error(
        "Feil ved sletting av konto:",
        error
      );

      let message =
        "Kontoen kunne ikke slettes. Prøv igjen.";

      if (
        error?.code === "auth/invalid-credential" ||
        error?.code === "auth/wrong-password"
      ) {
        message = "Passordet er feil.";
      } else if (
        error?.code === "auth/too-many-requests"
      ) {
        message =
          "For mange forsøk. Vent litt og prøv igjen.";
      } else if (
        error?.code === "auth/network-request-failed"
      ) {
        message =
          "Kontroller internettforbindelsen og prøv igjen.";
      } else if (
        error?.code === "permission-denied" ||
        error?.code === "firestore/permission-denied"
      ) {
        message =
          "Firestore-reglene tillater ikke kontosletting.";
      }

      showMessage(
        "Kunne ikke slette kontoen",
        message
      );
    } finally {
      setIsDeleting(false);
    }
  }

  function confirmDelete() {
    if (!password) {
      showMessage(
        "Skriv inn passord",
        "Du må bekrefte passordet ditt først."
      );
      return;
    }

    const title = "Slett kontoen permanent?";
    const message =
      "Dette kan ikke angres. Kontoen og personopplysningene dine blir slettet.";

    if (
      Platform.OS === "web" &&
      typeof window !== "undefined"
    ) {
      const confirmed = window.confirm(
        `${title}\n\n${message}`
      );

      if (confirmed) {
        void performDelete();
      }

      return;
    }

    Alert.alert(title, message, [
      {
        text: "Avbryt",
        style: "cancel",
      },
      {
        text: "Slett konto",
        style: "destructive",
        onPress: () => void performDelete(),
      },
    ]);
  }

  if (isLoading) {
    return (
      <>
        <Stack.Screen
          options={{ headerShown: false }}
        />

        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContainer}>
            <ActivityIndicator
              size="large"
              color="#B42318"
            />

            <Text style={styles.loadingText}>
              Laster konto...
            </Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <>
        <Stack.Screen
          options={{ headerShown: false }}
        />

        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={48}
              color="#1F7A3D"
            />

            <Text style={styles.centerTitle}>
              Du er ikke innlogget
            </Text>

            <Pressable
              style={styles.loginButton}
              onPress={() =>
                router.replace(
                  "/(tabs)/profile"
                )
              }
            >
              <Text style={styles.loginButtonText}>
                Gå til innlogging
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{ headerShown: false }}
      />

      <SafeAreaView
        style={styles.safeArea}
        edges={["top", "bottom"]}
      >
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
            onPress={() => router.back()}
            disabled={isDeleting}
          >
            <Ionicons
              name="chevron-back-outline"
              size={26}
              color="#202020"
            />
          </Pressable>

          <Text style={styles.headerTitle}>
            Slett konto
          </Text>

          <View style={styles.headerPlaceholder} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.warningIcon}>
              <Ionicons
                name="warning-outline"
                size={42}
                color="#B42318"
              />
            </View>

            <Text style={styles.title}>
              Slett kontoen permanent
            </Text>

            <Text style={styles.description}>
              Kontoen og personopplysningene dine blir
              permanent slettet. Dette kan ikke angres.
            </Text>

            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>
                Følgende blir slettet:
              </Text>

              <Text style={styles.warningText}>
                • Innloggingskontoen din
              </Text>

              <Text style={styles.warningText}>
                • Navn og e-post lagret i brukerprofilen
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Bekreft med passord
              </Text>

              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Skriv inn passordet ditt"
                placeholderTextColor="#999999"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isDeleting}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.deleteButton,
                pressed &&
                  !isDeleting &&
                  styles.pressed,
                isDeleting && styles.disabled,
              ]}
              onPress={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <Ionicons
                  name="trash-outline"
                  size={21}
                  color="#FFFFFF"
                />
              )}

              <Text
                style={styles.deleteButtonText}
              >
                {isDeleting
                  ? "Sletter konto..."
                  : "Slett konto permanent"}
              </Text>
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={isDeleting}
            >
              <Text
                style={styles.cancelButtonText}
              >
                Avbryt
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7F5",
  },

  keyboardView: {
    flex: 1,
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

  headerPlaceholder: {
    width: 42,
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 38,
    paddingBottom: 50,
  },

  warningIcon: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FDECEA",
  },

  title: {
    marginTop: 22,
    fontSize: 25,
    fontWeight: "900",
    color: "#202020",
    textAlign: "center",
  },

  description: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: "#686868",
    textAlign: "center",
  },

  warningCard: {
    marginTop: 26,
    padding: 17,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#F0BAB6",
    backgroundColor: "#FFF7F6",
  },

  warningTitle: {
    marginBottom: 9,
    fontSize: 15,
    fontWeight: "900",
    color: "#8F1D16",
  },

  warningText: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 20,
    color: "#6B2A25",
  },

  inputGroup: {
    marginTop: 25,
  },

  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "800",
    color: "#292929",
  },

  input: {
    minHeight: 55,
    paddingHorizontal: 15,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#D7DCD8",
    backgroundColor: "#FFFFFF",
    color: "#202020",
    fontSize: 16,
  },

  deleteButton: {
    minHeight: 56,
    marginTop: 22,
    borderRadius: 14,
    backgroundColor: "#B42318",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  cancelButton: {
    minHeight: 52,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    color: "#555555",
    fontSize: 15,
    fontWeight: "800",
  },

  centerContainer: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  centerTitle: {
    marginTop: 18,
    fontSize: 23,
    fontWeight: "900",
    color: "#202020",
  },

  loginButton: {
    minHeight: 52,
    marginTop: 24,
    paddingHorizontal: 24,
    borderRadius: 13,
    backgroundColor: "#1F7A3D",
    alignItems: "center",
    justifyContent: "center",
  },

  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  loadingText: {
    marginTop: 12,
    color: "#666666",
  },

  pressed: {
    opacity: 0.72,
  },

  disabled: {
    opacity: 0.55,
  },
});