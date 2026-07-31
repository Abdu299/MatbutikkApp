import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
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

import { db } from "../../firebase/firebaseConfig";

export default function EditOfferScreen() {
  const parameters = useLocalSearchParams();

  const offerId = Array.isArray(parameters.id)
    ? parameters.id[0]
    : parameters.id;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [duration, setDuration] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadOffer() {
      if (!offerId) {
        setIsLoading(false);

        Alert.alert(
          "Tilbud mangler",
          "Vi fant ingen tilbuds-ID.",
          [
            {
              text: "Gå tilbake",
              onPress: () => router.replace("/admin/manage-offers"),
            },
          ]
        );

        return;
      }

      try {
        const offerReference = doc(db, "offers", offerId);
        const offerSnapshot = await getDoc(offerReference);

        if (!offerSnapshot.exists()) {
          Alert.alert(
            "Tilbudet finnes ikke",
            "Tilbudet kan ha blitt slettet.",
            [
              {
                text: "Gå tilbake",
                onPress: () => router.replace("/admin/manage-offers"),
              },
            ]
          );

          return;
        }

        const offerData = offerSnapshot.data();

        setTitle(offerData.title ?? "");
        setDescription(offerData.description ?? "");

        setOldPrice(
          offerData.oldPrice !== undefined
            ? String(offerData.oldPrice)
            : ""
        );

        setOfferPrice(
          offerData.offerPrice !== undefined
            ? String(offerData.offerPrice)
            : ""
        );

        setDuration(offerData.duration ?? "");
      } catch (error) {
        console.error("Feil ved henting av tilbud:", error);

        Alert.alert(
          "Kunne ikke hente tilbudet",
          "Det oppstod en feil ved henting av data."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadOffer();
  }, [offerId]);

  function convertPriceToNumber(value: string) {
    const normalizedValue = value
      .trim()
      .replace(/\s/g, "")
      .replace(",", ".");

    return Number(normalizedValue);
  }

  function calculateDiscountPercentage(
    originalPrice: number,
    discountedPrice: number
  ) {
    if (originalPrice <= 0 || discountedPrice >= originalPrice) {
      return 0;
    }

    const discount =
      ((originalPrice - discountedPrice) / originalPrice) * 100;

    return Math.round(discount);
  }

  async function saveOfferChanges() {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedDuration = duration.trim();

    const numericOldPrice = convertPriceToNumber(oldPrice);
    const numericOfferPrice = convertPriceToNumber(offerPrice);

    if (!offerId) {
      Alert.alert(
        "Tilbud mangler",
        "Vi fant ingen tilbuds-ID."
      );

      return;
    }

    if (!trimmedTitle) {
      Alert.alert(
        "Tittel mangler",
        "Skriv inn tittelen på tilbudet."
      );

      return;
    }

    if (!trimmedDescription) {
      Alert.alert(
        "Beskrivelse mangler",
        "Skriv inn en kort beskrivelse av tilbudet."
      );

      return;
    }

    if (!oldPrice.trim()) {
      Alert.alert(
        "Originalpris mangler",
        "Skriv inn den opprinnelige prisen."
      );

      return;
    }

    if (
      Number.isNaN(numericOldPrice) ||
      numericOldPrice <= 0
    ) {
      Alert.alert(
        "Ugyldig originalpris",
        "Skriv inn en gyldig originalpris, for eksempel 49,90."
      );

      return;
    }

    if (!offerPrice.trim()) {
      Alert.alert(
        "Tilbudspris mangler",
        "Skriv inn tilbudsprisen."
      );

      return;
    }

    if (
      Number.isNaN(numericOfferPrice) ||
      numericOfferPrice < 0
    ) {
      Alert.alert(
        "Ugyldig tilbudspris",
        "Skriv inn en gyldig tilbudspris, for eksempel 29,90."
      );

      return;
    }

    if (numericOfferPrice >= numericOldPrice) {
      Alert.alert(
        "Tilbudsprisen er for høy",
        "Tilbudsprisen må være lavere enn originalprisen."
      );

      return;
    }

    if (!trimmedDuration) {
      Alert.alert(
        "Varighet mangler",
        "Skriv inn hvor lenge tilbudet varer."
      );

      return;
    }

    const discountPercentage = calculateDiscountPercentage(
      numericOldPrice,
      numericOfferPrice
    );

    try {
      setIsSaving(true);

      const offerReference = doc(db, "offers", offerId);

      await updateDoc(offerReference, {
        title: trimmedTitle,
        description: trimmedDescription,
        oldPrice: numericOldPrice,
        offerPrice: numericOfferPrice,
        discountPercentage,
        duration: trimmedDuration,
        updatedAt: serverTimestamp(),
      });

      Alert.alert(
        "Tilbud oppdatert",
        "Endringene ble lagret.",
        [
          {
            text: "Ferdig",
            onPress: () => router.replace("/admin/manage-offers"),
          },
        ]
      );
    } catch (error) {
      console.error("Feil ved oppdatering av tilbud:", error);

      Alert.alert(
        "Kunne ikke lagre",
        "Tilbudet kunne ikke oppdateres."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1F7A3D" />

        <Text style={styles.loadingText}>
          Henter tilbud...
        </Text>
      </View>
    );
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
        <View style={styles.header}>
          <View style={styles.badge}>
            <Ionicons
              name="create-outline"
              size={17}
              color="#8A5A00"
            />

            <Text style={styles.badgeText}>
              Rediger tilbud
            </Text>
          </View>

          <Text style={styles.title}>
            Oppdater tilbudet
          </Text>

          <Text style={styles.subtitle}>
            Endringene vises automatisk på tilbudssiden etter lagring.
          </Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Tilbudstittel
            </Text>

            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="For eksempel: Helgetilbud på kaffe"
              placeholderTextColor="#929292"
              editable={!isSaving}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Beskrivelse
            </Text>

            <TextInput
              style={[styles.input, styles.descriptionInput]}
              value={description}
              onChangeText={setDescription}
              placeholder="Skriv en kort beskrivelse av tilbudet"
              placeholderTextColor="#929292"
              multiline
              textAlignVertical="top"
              editable={!isSaving}
            />
          </View>

          <View style={styles.priceRow}>
            <View style={styles.priceColumn}>
              <Text style={styles.label}>
                Originalpris
              </Text>

              <View style={styles.priceInputContainer}>
                <TextInput
                  style={styles.priceInput}
                  value={oldPrice}
                  onChangeText={setOldPrice}
                  placeholder="0,00"
                  placeholderTextColor="#929292"
                  keyboardType="decimal-pad"
                  editable={!isSaving}
                />

                <Text style={styles.currencyText}>
                  kr
                </Text>
              </View>
            </View>

            <View style={styles.priceColumn}>
              <Text style={styles.label}>
                Tilbudspris
              </Text>

              <View style={styles.priceInputContainer}>
                <TextInput
                  style={styles.priceInput}
                  value={offerPrice}
                  onChangeText={setOfferPrice}
                  placeholder="0,00"
                  placeholderTextColor="#929292"
                  keyboardType="decimal-pad"
                  editable={!isSaving}
                />

                <Text style={styles.currencyText}>
                  kr
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Varighet
            </Text>

            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              placeholder="For eksempel: Gjelder til søndag"
              placeholderTextColor="#929292"
              editable={!isSaving}
            />
          </View>

          <View style={styles.informationBox}>
            <Ionicons
              name="information-circle-outline"
              size={22}
              color="#8A5A00"
            />

            <Text style={styles.informationText}>
              Rabattprosenten beregnes automatisk fra originalprisen og
              tilbudsprisen.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.buttonPressed,
              isSaving && styles.disabledButton,
            ]}
            onPress={saveOfferChanges}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <Ionicons
                name="save-outline"
                size={21}
                color="#FFFFFF"
              />
            )}

            <Text style={styles.saveButtonText}>
              {isSaving
                ? "Lagrer endringer..."
                : "Lagre endringer"}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.buttonPressed,
              isSaving && styles.disabledButton,
            ]}
            onPress={() => router.replace("/admin/manage-offers")}
            disabled={isSaving}
          >
            <Ionicons
              name="arrow-back-outline"
              size={20}
              color="#555555"
            />

            <Text style={styles.cancelButtonText}>
              Avbryt
            </Text>
          </Pressable>
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
    padding: 20,
    paddingTop: 28,
    paddingBottom: 70,
  },

  header: {
    marginBottom: 22,
  },

  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#FFF1D6",
  },

  badgeText: {
    color: "#8A5A00",
    fontSize: 13,
    fontWeight: "800",
  },

  title: {
    marginTop: 16,
    fontSize: 29,
    fontWeight: "900",
    color: "#171717",
  },

  subtitle: {
    marginTop: 7,
    fontSize: 15,
    lineHeight: 22,
    color: "#666666",
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

  input: {
    minHeight: 52,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7DCD8",
    backgroundColor: "#FAFBFA",
    color: "#202020",
    fontSize: 15,
  },

  descriptionInput: {
    minHeight: 125,
    paddingTop: 14,
    paddingBottom: 14,
  },

  priceRow: {
    marginBottom: 20,
    flexDirection: "row",
    gap: 12,
  },

  priceColumn: {
    flex: 1,
  },

  priceInputContainer: {
    minHeight: 52,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7DCD8",
    backgroundColor: "#FAFBFA",
    flexDirection: "row",
    alignItems: "center",
  },

  priceInput: {
    flex: 1,
    color: "#202020",
    fontSize: 15,
  },

  currencyText: {
    marginLeft: 8,
    color: "#666666",
    fontSize: 14,
    fontWeight: "800",
  },

  informationBox: {
    marginBottom: 22,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FFF5DF",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  informationText: {
    flex: 1,
    color: "#745321",
    fontSize: 13,
    lineHeight: 19,
  },

  saveButton: {
    minHeight: 54,
    borderRadius: 13,
    backgroundColor: "#1F7A3D",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  cancelButton: {
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

  cancelButtonText: {
    color: "#555555",
    fontSize: 15,
    fontWeight: "800",
  },

  buttonPressed: {
    opacity: 0.72,
  },

  disabledButton: {
    opacity: 0.55,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F7F5",
  },

  loadingText: {
    marginTop: 12,
    color: "#666666",
    fontSize: 14,
  },
});