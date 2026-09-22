import { Ionicons } from "@expo/vector-icons";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../context/AuthContext";
import { auth, db } from "../../firebase/firebaseConfig";

const APP_NAME = "Smak Carl Berner";
const OWNER_NAME = "SMAK CARL BERNER AS";

const SUPPORT_SITE =
  "https://butikkapp-support-site.vercel.app";

const URL_PARAMETERS =
  `app=${encodeURIComponent(APP_NAME)}` +
  `&owner=${encodeURIComponent(OWNER_NAME)}`;

const HELP_URL =
  `${SUPPORT_SITE}/hjelp?${URL_PARAMETERS}`;

const PRIVACY_URL =
  `${SUPPORT_SITE}/vilkar-og-personvern?${URL_PARAMETERS}`;

type ProfileMenuItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  danger?: boolean;
};

function ProfileMenuItem({
  icon,
  title,
  subtitle,
  onPress,
  danger = false,
}: ProfileMenuItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        pressed && styles.menuItemPressed,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.menuIcon,
          danger && styles.menuIconDanger,
        ]}
      >
        <Ionicons
          name={icon}
          size={21}
          color={danger ? "#B42318" : "#1F7A3D"}
        />
      </View>

      <View style={styles.menuTextContainer}>
        <Text
          style={[
            styles.menuTitle,
            danger && styles.menuTitleDanger,
          ]}
        >
          {title}
        </Text>

        <Text style={styles.menuSubtitle}>
          {subtitle}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward-outline"
        size={21}
        color={danger ? "#D66A62" : "#9A9A9A"}
      />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const {
    user,
    userProfile,
    isAdmin,
    isAuthenticated,
    isLoading,
    refreshUserProfile,
  } = useAuth();

  const [mode, setMode] =
    useState<"login" | "register">("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [isSendingReset, setIsSendingReset] =
    useState(false);

  const isBusy = isSubmitting || isSendingReset;

  function showMessage(
    title: string,
    message: string
  ) {
    if (
      Platform.OS === "web" &&
      typeof window !== "undefined"
    ) {
      window.alert(`${title}\n\n${message}`);
      return;
    }

    Alert.alert(title, message);
  }

  async function openExternalPage(url: string) {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error(
        "Kunne ikke åpne nettsiden:",
        error
      );

      showMessage(
        "Kunne ikke åpne siden",
        "Prøv igjen senere."
      );
    }
  }

  async function handleLogin() {
    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      showMessage(
        "Mangler informasjon",
        "Skriv inn e-post og passord."
      );
      return;
    }

    try {
      setIsSubmitting(true);

      await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      let message =
        "Kunne ikke logge inn. Kontroller e-post og passord.";

      if (
        error?.code === "auth/invalid-credential" ||
        error?.code === "auth/wrong-password" ||
        error?.code === "auth/user-not-found"
      ) {
        message = "Feil e-post eller passord.";
      } else if (
        error?.code === "auth/invalid-email"
      ) {
        message =
          "E-postadressen er ikke gyldig.";
      } else if (
        error?.code === "auth/too-many-requests"
      ) {
        message =
          "For mange innloggingsforsøk. Vent litt og prøv igjen.";
      } else if (
        error?.code ===
        "auth/network-request-failed"
      ) {
        message =
          "Kontroller internettforbindelsen og prøv igjen.";
      }

      showMessage(
        "Innlogging mislyktes",
        message
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail) {
      showMessage(
        "Skriv inn e-post",
        "Skriv inn e-postadressen din først, og trykk deretter på «Glemt passord?»."
      );
      return;
    }

    try {
      setIsSendingReset(true);

      await sendPasswordResetEmail(
        auth,
        cleanEmail
      );

      showMessage(
        "E-post sendt",
        "Hvis det finnes en konto med denne e-postadressen, mottar du en lenke for å lage et nytt passord. Sjekk også søppelpost."
      );
    } catch (error: any) {
      console.error(
        "Feil ved sending av passordlenke:",
        error
      );

      let message =
        "Kunne ikke sende e-posten. Prøv igjen.";

      if (error?.code === "auth/invalid-email") {
        message =
          "E-postadressen er ikke gyldig.";
      } else if (
        error?.code === "auth/too-many-requests"
      ) {
        message =
          "For mange forsøk. Vent litt og prøv igjen.";
      } else if (
        error?.code ===
        "auth/network-request-failed"
      ) {
        message =
          "Kontroller internettforbindelsen og prøv igjen.";
      }

      showMessage(
        "Kunne ikke sende e-post",
        message
      );
    } finally {
      setIsSendingReset(false);
    }
  }

  async function handleRegister() {
    const cleanName = name.trim();
    const cleanEmail =
      email.trim().toLowerCase();

    if (
      !cleanName ||
      !cleanEmail ||
      !password ||
      !confirmPassword
    ) {
      showMessage(
        "Mangler informasjon",
        "Skriv inn navn, e-post og passord to ganger."
      );
      return;
    }

    if (password.length < 6) {
      showMessage(
        "Passordet er for kort",
        "Passordet må inneholde minst 6 tegn."
      );
      return;
    }

    if (password !== confirmPassword) {
      showMessage(
        "Passordene er forskjellige",
        "Passordene du skrev inn er ikke like. Kontroller begge passordfeltene."
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );

      await updateProfile(
        userCredential.user,
        {
          displayName: cleanName,
        }
      );

      await setDoc(
        doc(
          db,
          "users",
          userCredential.user.uid
        ),
        {
          uid: userCredential.user.uid,
          name: cleanName,
          email: cleanEmail,
          role: "user",
          createdAt: new Date(),
        }
      );

      await refreshUserProfile();

      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      showMessage(
        "Konto opprettet",
        "Du er nå registrert og innlogget."
      );
    } catch (error: any) {
      let message =
        "Kunne ikke opprette brukeren.";

      if (
        error?.code ===
        "auth/email-already-in-use"
      ) {
        message =
          "Det finnes allerede en bruker med denne e-postadressen.";
      } else if (
        error?.code === "auth/invalid-email"
      ) {
        message =
          "E-postadressen er ikke gyldig.";
      } else if (
        error?.code === "auth/weak-password"
      ) {
        message = "Passordet er for svakt.";
      } else if (
        error?.code ===
        "auth/network-request-failed"
      ) {
        message =
          "Kontroller internettforbindelsen og prøv igjen.";
      }

      showMessage(
        "Registrering mislyktes",
        message
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function switchMode() {
    setMode((currentMode) =>
      currentMode === "login"
        ? "register"
        : "login"
    );

    setPassword("");
    setConfirmPassword("");
  }

  async function handleLogout() {
    try {
      await signOut(auth);
    } catch {
      showMessage(
        "Feil",
        "Kunne ikke logge ut."
      );
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={["top"]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color="#1F7A3D"
          />

          <Text style={styles.loadingText}>
            Laster profil...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isAuthenticated && user) {
    const displayName =
      userProfile?.name?.trim() ||
      user.displayName?.trim() ||
      "Bruker";

    const displayEmail =
      userProfile?.email ||
      user.email ||
      "";

    const initials = displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) =>
        part.charAt(0).toUpperCase()
      )
      .join("");

    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={["top"]}
      >
        <ScrollView
          contentContainerStyle={
            styles.profileContainer
          }
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageTitle}>
            {isAdmin
              ? "Adminprofil"
              : "Min profil"}
          </Text>

          <View style={styles.userCard}>
            <View style={styles.avatar}>
              {isAdmin ? (
                <Ionicons
                  name="shield-checkmark-outline"
                  size={34}
                  color="#1F7A3D"
                />
              ) : (
                <Text style={styles.avatarText}>
                  {initials || "B"}
                </Text>
              )}
            </View>

            <View style={styles.userInformation}>
              <Text style={styles.userName}>
                {displayName}
              </Text>

              <Text style={styles.userEmail}>
                {displayEmail}
              </Text>
            </View>
          </View>

          {isAdmin && (
            <Pressable
              style={({ pressed }) => [
                styles.adminButton,
                pressed &&
                  styles.buttonPressed,
              ]}
              onPress={() =>
                router.push("/admin")
              }
            >
              <View
                style={
                  styles.adminButtonIcon
                }
              >
                <Ionicons
                  name="settings-outline"
                  size={22}
                  color="#FFFFFF"
                />
              </View>

              <View
                style={
                  styles.adminButtonTextContainer
                }
              >
                <Text
                  style={
                    styles.adminButtonTitle
                  }
                >
                  Åpne adminpanelet
                </Text>

                <Text
                  style={
                    styles.adminButtonSubtitle
                  }
                >
                  Administrer produkter og tilbud
                </Text>
              </View>

              <Ionicons
                name="chevron-forward-outline"
                size={21}
                color="#FFFFFF"
              />
            </Pressable>
          )}

          <Text style={styles.sectionTitle}>
            Konto
          </Text>

          <View style={styles.menuCard}>
            <ProfileMenuItem
              icon="person-outline"
              title="Personopplysninger"
              subtitle="Se og endre navn og kontoinformasjon"
              onPress={() =>
                router.push(
                  "/personal-information" as never
                )
              }
            />

            <View
              style={styles.menuDivider}
            />

            <ProfileMenuItem
              icon="ticket-outline"
              title="Tilbudskontroll"
              subtitle="Vis at du har appen for å få tilbudet"
              onPress={() =>
                router.push(
                  "/offer-control" as never
                )
              }
            />
          </View>

          <Text style={styles.sectionTitle}>
            Hjelp og informasjon
          </Text>

          <View style={styles.menuCard}>
            <ProfileMenuItem
              icon="help-circle-outline"
              title="Hjelp og kundeservice"
              subtitle="Finn svar eller kontakt butikken"
              onPress={() =>
                void openExternalPage(
                  HELP_URL
                )
              }
            />

            <View
              style={styles.menuDivider}
            />

            <ProfileMenuItem
              icon="document-text-outline"
              title="Vilkår og personvern"
              subtitle="Les våre vilkår og personvernregler"
              onPress={() =>
                void openExternalPage(
                  PRIVACY_URL
                )
              }
            />

            {!isAdmin && (
              <>
                <View
                  style={
                    styles.menuDivider
                  }
                />

                <ProfileMenuItem
                  icon="trash-outline"
                  title="Slett konto"
                  subtitle="Slett kontoen og personopplysningene dine"
                  danger
                  onPress={() =>
                    router.push(
                      "/delete-account" as never
                    )
                  }
                />
              </>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              pressed &&
                styles.buttonPressed,
            ]}
            onPress={handleLogout}
          >
            <Ionicons
              name="log-out-outline"
              size={21}
              color="#B42318"
            />

            <Text
              style={
                styles.logoutButtonText
              }
            >
              Logg ut
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.authContainer
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.authIcon}>
            <Ionicons
              name="person-outline"
              size={40}
              color="#1F7A3D"
            />
          </View>

          <Text style={styles.authTitle}>
            {mode === "login"
              ? "Velkommen tilbake"
              : "Opprett konto"}
          </Text>

          <Text
            style={styles.authDescription}
          >
            {mode === "login"
              ? "Logg inn for å få tilgang til profilen din."
              : "Registrer deg for å opprette en personlig konto."}
          </Text>

          {mode === "register" && (
            <View style={styles.inputGroup}>
              <Text
                style={styles.inputLabel}
              >
                Navn
              </Text>

              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Skriv inn navnet ditt"
                placeholderTextColor="#999999"
                autoCapitalize="words"
                editable={!isBusy}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              E-post
            </Text>

            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="eksempel@email.no"
              placeholderTextColor="#999999"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isBusy}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Passord
            </Text>

            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Skriv inn passord"
              placeholderTextColor="#999999"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isBusy}
            />
          </View>

          {mode === "register" && (
            <View style={styles.inputGroup}>
              <Text
                style={styles.inputLabel}
              >
                Gjenta passord
              </Text>

              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={
                  setConfirmPassword
                }
                placeholder="Skriv inn passordet på nytt"
                placeholderTextColor="#999999"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isBusy}
                onSubmitEditing={
                  handleRegister
                }
              />
            </View>
          )}

          {mode === "login" && (
            <Pressable
              style={({ pressed }) => [
                styles.forgotPasswordButton,
                pressed &&
                  styles.buttonPressed,
              ]}
              onPress={
                handleForgotPassword
              }
              disabled={isBusy}
            >
              {isSendingReset ? (
                <>
                  <ActivityIndicator
                    size="small"
                    color="#1F7A3D"
                  />

                  <Text
                    style={
                      styles.forgotPasswordText
                    }
                  >
                    Sender e-post...
                  </Text>
                </>
              ) : (
                <Text
                  style={
                    styles.forgotPasswordText
                  }
                >
                  Glemt passord?
                </Text>
              )}
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed &&
                styles.buttonPressed,
              isBusy &&
                styles.disabledButton,
            ]}
            onPress={
              mode === "login"
                ? handleLogin
                : handleRegister
            }
            disabled={isBusy}
          >
            {isSubmitting ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <Text
                style={
                  styles.primaryButtonText
                }
              >
                {mode === "login"
                  ? "Logg inn"
                  : "Opprett konto"}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.switchButton}
            onPress={switchMode}
            disabled={isBusy}
          >
            <Text style={styles.switchText}>
              {mode === "login"
                ? "Har du ikke konto? "
                : "Har du allerede konto? "}
            </Text>

            <Text
              style={styles.switchTextBold}
            >
              {mode === "login"
                ? "Registrer deg"
                : "Logg inn"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    color: "#666666",
    fontSize: 15,
  },

  profileContainer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 120,
  },

  pageTitle: {
    fontSize: 31,
    fontWeight: "900",
    color: "#171717",
    marginBottom: 22,
  },

  userCard: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E5E2",
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E3EDE5",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1F7A3D",
  },

  userInformation: {
    flex: 1,
    marginLeft: 15,
  },

  userName: {
    fontSize: 19,
    fontWeight: "900",
    color: "#202020",
  },

  userEmail: {
    marginTop: 5,
    fontSize: 14,
    color: "#747474",
  },

  adminButton: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#1F7A3D",
    flexDirection: "row",
    alignItems: "center",
  },

  adminButtonIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor:
      "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },

  adminButtonTextContainer: {
    flex: 1,
    marginLeft: 13,
  },

  adminButtonTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  adminButtonSubtitle: {
    marginTop: 3,
    color:
      "rgba(255,255,255,0.78)",
    fontSize: 12,
  },

  sectionTitle: {
    marginTop: 27,
    marginBottom: 10,
    marginLeft: 3,
    fontSize: 14,
    fontWeight: "800",
    color: "#676767",
  },

  menuCard: {
    overflow: "hidden",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E5E2",
  },

  menuItem: {
    minHeight: 76,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  menuItemPressed: {
    backgroundColor: "#F2F5F2",
  },

  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#EAF3EC",
    alignItems: "center",
    justifyContent: "center",
  },

  menuIconDanger: {
    backgroundColor: "#FFF0EE",
  },

  menuTextContainer: {
    flex: 1,
    marginLeft: 13,
    marginRight: 8,
  },

  menuTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#202020",
  },

  menuTitleDanger: {
    color: "#B42318",
  },

  menuSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: "#777777",
  },

  menuDivider: {
    height: 1,
    marginLeft: 71,
    backgroundColor: "#ECEFEC",
  },

  logoutButton: {
    minHeight: 54,
    marginTop: 25,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F0BAB6",
    backgroundColor: "#FFF7F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  logoutButtonText: {
    color: "#B42318",
    fontSize: 15,
    fontWeight: "800",
  },

  versionText: {
    marginTop: 22,
    textAlign: "center",
    color: "#9A9A9A",
    fontSize: 12,
  },

  authContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 55,
    paddingBottom: 80,
    justifyContent: "center",
  },

  authIcon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#E3EDE5",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 22,
  },

  authTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "#171717",
    textAlign: "center",
  },

  authDescription: {
    marginTop: 10,
    marginBottom: 30,
    fontSize: 15,
    lineHeight: 22,
    color: "#686868",
    textAlign: "center",
  },

  inputGroup: {
    marginBottom: 16,
  },

  inputLabel: {
    marginBottom: 7,
    fontSize: 14,
    fontWeight: "700",
    color: "#333333",
  },

  input: {
    minHeight: 54,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#D6DAD6",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    color: "#171717",
    fontSize: 16,
  },

  forgotPasswordButton: {
    minHeight: 38,
    marginTop: -7,
    marginBottom: 8,
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 4,
  },

  forgotPasswordText: {
    color: "#1F7A3D",
    fontSize: 14,
    fontWeight: "800",
  },

  primaryButton: {
    marginTop: 6,
    minHeight: 54,
    backgroundColor: "#1F7A3D",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  switchButton: {
    marginTop: 20,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  switchText: {
    color: "#666666",
    fontSize: 15,
  },

  switchTextBold: {
    color: "#1F7A3D",
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