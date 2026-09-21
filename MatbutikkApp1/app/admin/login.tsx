import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
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

import { auth } from "../../firebase/firebaseConfig";

export default function AdminLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  async function loginAdmin() {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      Alert.alert(
        "E-post mangler",
        "Skriv inn e-postadressen til administratorkontoen."
      );

      return;
    }

    if (!password) {
      Alert.alert(
        "Passord mangler",
        "Skriv inn passordet til administratorkontoen."
      );

      return;
    }

    try {
      setIsLoggingIn(true);

      await signInWithEmailAndPassword(
        auth,
        trimmedEmail,
        password
      );

      setPassword("");

      router.dismissAll();
      router.replace("/admin");
    } catch (error: any) {
      //console.error("Feil ved admin-innlogging:", error);

      let errorMessage =
        "Kunne ikke logge inn. Kontroller e-post og passord.";

      if (error?.code === "auth/invalid-email") {
        errorMessage = "E-postadressen er ikke gyldig.";
      }

      if (
        error?.code === "auth/invalid-credential" ||
        error?.code === "auth/wrong-password" ||
        error?.code === "auth/user-not-found"
      ) {
        errorMessage = "Feil e-postadresse eller passord.";
      }

      if (error?.code === "auth/too-many-requests") {
        errorMessage =
          "For mange innloggingsforsøk. Vent litt og prøv igjen.";
      }

      if (error?.code === "auth/network-request-failed") {
        errorMessage =
          "Kunne ikke koble til internett. Kontroller nettverket ditt.";
      }

      Alert.alert("Innlogging mislyktes", errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons
              name="shield-checkmark"
              size={42}
              color="#FFFFFF"
            />
          </View>
        </View>

        <View style={styles.header}>
          <View style={styles.badge}>
            <Ionicons
              name="lock-closed-outline"
              size={17}
              color="#1F7A3D"
            />

            <Text style={styles.badgeText}>
              Sikker innlogging
            </Text>
          </View>

          <Text style={styles.title}>
            Admin-innlogging
          </Text>

          <Text style={styles.subtitle}>
            Logg inn med administratorkontoen for å administrere produkter
            og tilbud.
          </Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              E-postadresse
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={21}
                color="#747474"
              />

              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="admin@butikk.no"
                placeholderTextColor="#929292"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                editable={!isLoggingIn}
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Passord
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="key-outline"
                size={21}
                color="#747474"
              />

              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Skriv inn passord"
                placeholderTextColor="#929292"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                editable={!isLoggingIn}
                returnKeyType="done"
                onSubmitEditing={loginAdmin}
              />

              <Pressable
                style={({ pressed }) => [
                  styles.passwordButton,
                  pressed && styles.smallButtonPressed,
                ]}
                onPress={() => setShowPassword((current) => !current)}
                disabled={isLoggingIn}
              >
                <Ionicons
                  name={
                    showPassword
                      ? "eye-off-outline"
                      : "eye-outline"
                  }
                  size={22}
                  color="#5E5E5E"
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.loginButton,
              pressed && styles.buttonPressed,
              isLoggingIn && styles.disabledButton,
            ]}
            onPress={loginAdmin}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <Ionicons
                name="log-in-outline"
                size={22}
                color="#FFFFFF"
              />
            )}

            <Text style={styles.loginButtonText}>
              {isLoggingIn
                ? "Logger inn..."
                : "Logg inn som admin"}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.buttonPressed,
              isLoggingIn && styles.disabledButton,
            ]}
            onPress={() => router.back()}
            disabled={isLoggingIn}
          >
            <Ionicons
              name="arrow-back-outline"
              size={20}
              color="#555555"
            />

            <Text style={styles.backButtonText}>
              Gå tilbake
            </Text>
          </Pressable>
        </View>

        <View style={styles.informationBox}>
          <Ionicons
            name="information-circle-outline"
            size={22}
            color="#2166A5"
          />

          <Text style={styles.informationText}>
            Bare brukere som er opprettet i Firebase Authentication kan
            logge inn.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F7F5",
  },

  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    paddingTop: 50,
    paddingBottom: 60,
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },

  logoCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#1F7A3D",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },

  header: {
    alignItems: "center",
    marginBottom: 26,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#E3EDE5",
  },

  badgeText: {
    color: "#1F7A3D",
    fontSize: 13,
    fontWeight: "800",
  },

  title: {
    marginTop: 16,
    fontSize: 30,
    fontWeight: "900",
    color: "#171717",
    textAlign: "center",
  },

  subtitle: {
    maxWidth: 420,
    marginTop: 9,
    fontSize: 15,
    lineHeight: 22,
    color: "#666666",
    textAlign: "center",
  },

  formCard: {
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
    padding: 19,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E5E2",
  },

  inputGroup: {
    marginBottom: 19,
  },

  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "800",
    color: "#292929",
  },

  inputContainer: {
    minHeight: 54,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7DCD8",
    backgroundColor: "#FAFBFA",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  input: {
    flex: 1,
    minHeight: 52,
    color: "#202020",
    fontSize: 15,
  },

  passwordButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  loginButton: {
    minHeight: 55,
    marginTop: 4,
    borderRadius: 13,
    backgroundColor: "#1F7A3D",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  backButton: {
    minHeight: 50,
    marginTop: 11,
    borderRadius: 13,
    backgroundColor: "#F0F1F0",
    borderWidth: 1,
    borderColor: "#D8DBD8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  backButtonText: {
    color: "#555555",
    fontSize: 15,
    fontWeight: "800",
  },

  informationBox: {
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#EAF2F8",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  informationText: {
    flex: 1,
    color: "#36566F",
    fontSize: 13,
    lineHeight: 19,
  },

  buttonPressed: {
    opacity: 0.72,
  },

  smallButtonPressed: {
    backgroundColor: "#ECEEEC",
  },

  disabledButton: {
    opacity: 0.55,
  },
});