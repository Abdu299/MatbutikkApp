import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  router,
  useLocalSearchParams,
} from "expo-router";
import {
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
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

function getStartOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return today;
}

function getEndOfDay(date: Date) {
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return endOfDay;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getTimestampDate(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate ===
      "function"
  ) {
    return (
      value as {
        toDate: () => Date;
      }
    ).toDate();
  }

  return null;
}

export default function EditProductScreen() {
  const parameters = useLocalSearchParams();

  const productId = Array.isArray(parameters.id)
    ? parameters.id[0]
    : parameters.id;

  const [name, setName] = useState("");
  const [description, setDescription] =
    useState("");

  const [price, setPrice] = useState("");

  const [expirationDate, setExpirationDate] =
    useState<Date | null>(null);

  const [showDatePicker, setShowDatePicker] =
    useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      if (!productId) {
        setIsLoading(false);

        Alert.alert(
          "Produkt mangler",
          "Vi fant ingen produkt-ID.",
          [
            {
              text: "Gå tilbake",
              onPress: () =>
                router.replace(
                  "/admin/manage-products"
                ),
            },
          ]
        );

        return;
      }

      try {
        const productReference = doc(
          db,
          "products",
          productId
        );

        const productSnapshot =
          await getDoc(productReference);

        if (!productSnapshot.exists()) {
          Alert.alert(
            "Produktet finnes ikke",
            "Produktet kan ha blitt slettet.",
            [
              {
                text: "Gå tilbake",
                onPress: () =>
                  router.replace(
                    "/admin/manage-products"
                  ),
              },
            ]
          );

          return;
        }

        const productData =
          productSnapshot.data();

        setName(productData.name ?? "");

        setDescription(
          productData.description ?? ""
        );

        setPrice(
          productData.price !== undefined
            ? String(productData.price)
            : ""
        );

        setExpirationDate(
          getTimestampDate(productData.expiresAt)
        );
      } catch (error) {
        console.error(
          "Feil ved henting av produkt:",
          error
        );

        Alert.alert(
          "Kunne ikke hente produktet",
          "Det oppstod en feil ved henting av data."
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadProduct();
  }, [productId]);

  function handleDateChange(
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) {
    setShowDatePicker(false);

    if (event.type === "dismissed" || !selectedDate) {
      return;
    }

    setExpirationDate(selectedDate);
  }

  function convertPriceToNumber(value: string) {
    return Number(
      value
        .trim()
        .replace(/\s/g, "")
        .replace(",", ".")
    );
  }

  async function saveProductChanges() {
    const trimmedName = name.trim();

    const trimmedDescription =
      description.trim();

    const numericPrice =
      convertPriceToNumber(price);

    if (!productId) {
      Alert.alert(
        "Produkt mangler",
        "Vi fant ingen produkt-ID."
      );

      return;
    }

    if (!trimmedName) {
      Alert.alert(
        "Produktnavn mangler",
        "Skriv inn navnet på produktet."
      );

      return;
    }

    if (!trimmedDescription) {
      Alert.alert(
        "Beskrivelse mangler",
        "Skriv inn en kort beskrivelse av produktet."
      );

      return;
    }

    if (
      !price.trim() ||
      Number.isNaN(numericPrice) ||
      numericPrice <= 0
    ) {
      Alert.alert(
        "Ugyldig pris",
        "Skriv inn en gyldig produktpris."
      );

      return;
    }

    if (!expirationDate) {
      Alert.alert(
        "Utløpsdato mangler",
        "Velg datoen produktet skal forsvinne fra appen."
      );

      return;
    }

    if (getEndOfDay(expirationDate).getTime() <= Date.now()) {
      Alert.alert(
        "Utløpsdatoen er passert",
        "Velg dagens dato eller en senere dato."
      );

      return;
    }

    try {
      setIsSaving(true);

      const productReference = doc(
        db,
        "products",
        productId
      );

      await updateDoc(productReference, {
        name: trimmedName,
        description: trimmedDescription,
        price: numericPrice,

        expiresAt: Timestamp.fromDate(
          getEndOfDay(expirationDate)
        ),

        updatedAt: serverTimestamp(),
      });

      Alert.alert(
        "Produkt oppdatert",
        "Endringene og utløpsdatoen ble lagret.",
        [
          {
            text: "Ferdig",
            onPress: () =>
              router.replace(
                "/admin/manage-products"
              ),
          },
        ]
      );
    } catch (error) {
      console.error(
        "Feil ved oppdatering av produkt:",
        error
      );

      Alert.alert(
        "Kunne ikke lagre",
        "Produktet kunne ikke oppdateres."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color="#2166A5"
        />

        <Text style={styles.loadingText}>
          Henter produkt...
        </Text>
      </View>
    );
  }

  const pickerValue =
    expirationDate &&
    expirationDate.getTime() >=
      getStartOfToday().getTime()
      ? expirationDate
      : getStartOfToday();

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={
        Platform.OS === "ios" ? "padding" : undefined
      }
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
              color="#2166A5"
            />

            <Text style={styles.badgeText}>
              Rediger produkt
            </Text>
          </View>

          <Text style={styles.title}>
            Oppdater produktet
          </Text>

          <Text style={styles.subtitle}>
            Endringene vises automatisk på
            produktsiden etter lagring.
          </Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Produktnavn
            </Text>

            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="For eksempel: Protein-yoghurt"
              placeholderTextColor="#929292"
              editable={!isSaving}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Beskrivelse
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.descriptionInput,
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Skriv en kort beskrivelse av produktet"
              placeholderTextColor="#929292"
              multiline
              textAlignVertical="top"
              editable={!isSaving}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pris</Text>

            <View style={styles.priceInputContainer}>
              <TextInput
                style={styles.priceInput}
                value={price}
                onChangeText={setPrice}
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Automatisk utløpsdato
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.dateButton,
                pressed &&
                  styles.dateButtonPressed,
                isSaving &&
                  styles.disabledButton,
              ]}
              onPress={() =>
                setShowDatePicker(true)
              }
              disabled={isSaving}
            >
              <Ionicons
                name="calendar-outline"
                size={22}
                color="#2166A5"
              />

              <View
                style={styles.dateButtonContent}
              >
                <Text
                  style={styles.dateButtonLabel}
                >
                  {expirationDate
                    ? "Valgt utløpsdato"
                    : "Velg utløpsdato"}
                </Text>

                <Text
                  style={[
                    styles.dateButtonValue,
                    !expirationDate &&
                      styles.datePlaceholder,
                  ]}
                >
                  {expirationDate
                    ? formatDate(expirationDate)
                    : "Trykk for å åpne kalenderen"}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward-outline"
                size={21}
                color="#777777"
              />
            </Pressable>

            {showDatePicker ? (
              <View
                style={styles.datePickerContainer}
              >
                <DateTimePicker
                value={pickerValue}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "calendar"}
                minimumDate={getStartOfToday()}
                onChange={handleDateChange}
                themeVariant="light"
                accentColor="#1F7A3D"
              />
              </View>
            ) : null}
          </View>

          <View style={styles.informationBox}>
            <Ionicons
              name="information-circle-outline"
              size={22}
              color="#2166A5"
            />

            <Text style={styles.informationText}>
              Produktet forsvinner automatisk fra
              kundesiden etter kl. 23:59 på den
              valgte utløpsdatoen.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.buttonPressed,
              isSaving && styles.disabledButton,
            ]}
            onPress={() =>
              void saveProductChanges()
            }
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
            onPress={() =>
              router.replace(
                "/admin/manage-products"
              )
            }
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
    backgroundColor: "#E5EFF8",
  },

  badgeText: {
    color: "#2166A5",
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

  dateButton: {
    minHeight: 72,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7DCD8",
    backgroundColor: "#FAFBFA",
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  dateButtonPressed: {
    backgroundColor: "#EDF5FC",
  },

  dateButtonContent: {
    flex: 1,
  },

  dateButtonLabel: {
    fontSize: 12,
    color: "#777777",
  },

  dateButtonValue: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "800",
    color: "#202020",
  },

  datePlaceholder: {
    fontSize: 13,
    fontWeight: "600",
    color: "#929292",
  },

  datePickerContainer: {
    marginTop: 12,
    minHeight: 355,
    overflow: "hidden",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DDD9",
    justifyContent: "center",
  },

  informationBox: {
    marginBottom: 22,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#E5EFF8",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  informationText: {
    flex: 1,
    color: "#315D80",
    fontSize: 13,
    lineHeight: 19,
  },

  saveButton: {
    minHeight: 54,
    borderRadius: 13,
    backgroundColor: "#2166A5",
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