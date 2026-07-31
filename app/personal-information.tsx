import { Ionicons } from "@expo/vector-icons";
import { updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { Stack, router } from "expo-router";
import { useEffect, useState } from "react";
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

export default function PersonalInformationScreen() {
  const {
    user,
    userProfile,
    isAuthenticated,
    isLoading,
    refreshUserProfile,
  } = useAuth();

  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const currentName =
      userProfile?.name?.trim() ||
      user?.displayName?.trim() ||
      "";

    setName(currentName);
  }, [userProfile?.name, user?.displayName]);

  async function saveInformation() {
    const cleanName = name.trim();

    if (!user) {
      Alert.alert(
        "Ikke innlogget",
        "Du må være logget inn for å endre personopplysninger."
      );
      return;
    }

    if (cleanName.length < 2) {
      Alert.alert(
        "Ugyldig navn",
        "Navnet må inneholde minst to tegn."
      );
      return;
    }

    try {
      setIsSaving(true);

      await updateProfile(user, {
        displayName: cleanName,
      });

      await updateDoc(doc(db, "users", user.uid), {
        name: cleanName,
      });

      await refreshUserProfile();

      Alert.alert(
        "Endringer lagret",
        "Personopplysningene dine er oppdatert.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch {
      Alert.alert(
        "Kunne ikke lagre",
        "Det oppstod en feil. Prøv igjen."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />

        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1F7A3D" />

            <Text style={styles.loadingText}>
              Laster personopplysninger...
            </Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />

        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.notLoggedInContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={48}
              color="#1F7A3D"
            />

            <Text style={styles.notLoggedInTitle}>
              Du er ikke innlogget
            </Text>

            <Text style={styles.notLoggedInText}>
              Logg inn for å se og endre personopplysningene dine.
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.replace("/(tabs)/profile")}
            >
              <Text style={styles.primaryButtonText}>
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

          <Text style={styles.title}>Personopplysninger</Text>

          <View style={styles.headerPlaceholder} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={20}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.description}>
              Hold navnet og kontoinformasjonen din oppdatert.
            </Text>

            <View style={styles.avatar}>
              <Ionicons
                name="person-outline"
                size={42}
                color="#1F7A3D"
              />
            </View>

            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Navn</Text>

                <View style={styles.inputContainer}>
                  <Ionicons
                    name="person-outline"
                    size={21}
                    color="#777777"
                  />

                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Skriv inn navnet ditt"
                    placeholderTextColor="#999999"
                    autoCapitalize="words"
                    editable={!isSaving}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>E-postadresse</Text>

                <View style={styles.disabledInputContainer}>
                  <Ionicons
                    name="mail-outline"
                    size={21}
                    color="#8A8A8A"
                  />

                  <Text style={styles.disabledInputText}>
                    {user.email}
                  </Text>

                  <Ionicons
                    name="lock-closed-outline"
                    size={17}
                    color="#999999"
                  />
                </View>

                <Text style={styles.helperText}>
                  E-postadressen kan ikke endres her.
                </Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                pressed && !isSaving && styles.buttonPressed,
                isSaving && styles.disabledButton,
              ]}
              onPress={saveInformation}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name="checkmark-outline"
                  size={22}
                  color="#FFFFFF"
                />
              )}

              <Text style={styles.saveButtonText}>
                {isSaving ? "Lagrer..." : "Lagre endringer"}
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

  headerPlaceholder: {
    width: 42,
  },

  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "900",
    color: "#202020",
  },

  keyboardView: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 50,
  },

  description: {
    fontSize: 15,
    lineHeight: 22,
    color: "#6B6B6B",
    textAlign: "center",
  },

  avatar: {
    width: 90,
    height: 90,
    marginTop: 27,
    marginBottom: 27,
    borderRadius: 45,
    alignSelf: "center",
    backgroundColor: "#E3EDE5",
    alignItems: "center",
    justifyContent: "center",
  },

  formCard: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E5E2",
  },

  inputGroup: {
    marginBottom: 20,
  },

  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "800",
    color: "#292929",
  },

  inputContainer: {
    minHeight: 55,
    paddingHorizontal: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#D7DCD8",
    backgroundColor: "#FAFBFA",
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  input: {
    flex: 1,
    minHeight: 53,
    fontSize: 16,
    color: "#202020",
  },

  disabledInputContainer: {
    minHeight: 55,
    paddingHorizontal: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#F1F2F1",
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  disabledInputText: {
    flex: 1,
    fontSize: 15,
    color: "#777777",
  },

  helperText: {
    marginTop: 7,
    fontSize: 12,
    color: "#888888",
  },

  saveButton: {
    minHeight: 56,
    marginTop: 20,
    borderRadius: 14,
    backgroundColor: "#1F7A3D",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666666",
  },

  notLoggedInContainer: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  notLoggedInTitle: {
    marginTop: 18,
    fontSize: 24,
    fontWeight: "900",
    color: "#202020",
  },

  notLoggedInText: {
    marginTop: 9,
    fontSize: 15,
    lineHeight: 22,
    color: "#707070",
    textAlign: "center",
  },

  primaryButton: {
    minHeight: 54,
    marginTop: 24,
    paddingHorizontal: 25,
    borderRadius: 13,
    backgroundColor: "#1F7A3D",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  buttonPressed: {
    opacity: 0.72,
  },

  disabledButton: {
    opacity: 0.55,
  },
});