import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { useState } from "react";
import {
  Alert,
  Image,
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
import {
  sendNewContentPushNotification,
} from "../../services/pushNotifications";

const MAX_IMAGE_LENGTH = 750000;

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

export default function AddProductScreen() {
  const [name, setName] = useState("");
  const [description, setDescription] =
    useState("");

  const [price, setPrice] = useState("");

  const [expirationDate, setExpirationDate] =
    useState<Date | null>(null);

  const [showDatePicker, setShowDatePicker] =
    useState(false);

  const [imageUri, setImageUri] = useState<
    string | null
  >(null);

  const [imageBase64, setImageBase64] = useState<
    string | null
  >(null);

  const [isProcessingImage, setIsProcessingImage] =
    useState(false);

  const [isSaving, setIsSaving] = useState(false);

  async function pickImage() {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Tillatelse mangler",
          "Du må gi appen tilgang til bildene dine for å velge et produktbilde."
        );

        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });

      if (result.canceled) {
        return;
      }

      const selectedImageUri = result.assets[0].uri;

      setIsProcessingImage(true);

      const manipulatedImage =
        await ImageManipulator.manipulateAsync(
          selectedImageUri,
          [
            {
              resize: {
                width: 700,
              },
            },
          ],
          {
            compress: 0.45,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true,
          }
        );

      if (!manipulatedImage.base64) {
        throw new Error(
          "Bildet kunne ikke konverteres til Base64."
        );
      }

      const imageDataUrl =
        `data:image/jpeg;base64,${manipulatedImage.base64}`;

      if (imageDataUrl.length > MAX_IMAGE_LENGTH) {
        Alert.alert(
          "Bildet er for stort",
          "Velg et enklere eller mindre bilde. Bildet er fortsatt for stort etter komprimering."
        );

        setImageUri(null);
        setImageBase64(null);

        return;
      }

      setImageUri(manipulatedImage.uri);
      setImageBase64(imageDataUrl);
    } catch (error) {
      console.error(
        "Feil ved behandling av bilde:",
        error
      );

      Alert.alert(
        "Kunne ikke behandle bildet",
        "Det oppstod en feil da bildet skulle komprimeres. Prøv et annet bilde."
      );

      setImageUri(null);
      setImageBase64(null);
    } finally {
      setIsProcessingImage(false);
    }
  }

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

  function validateForm() {
    const parsedPrice =
      convertPriceToNumber(price);

    if (!imageBase64) {
      Alert.alert(
        "Manglende produktbilde",
        "Velg et bilde før du publiserer produktet."
      );

      return false;
    }

    if (!name.trim()) {
      Alert.alert(
        "Manglende navn",
        "Skriv inn navnet på produktet."
      );

      return false;
    }

    if (!description.trim()) {
      Alert.alert(
        "Manglende beskrivelse",
        "Skriv inn en kort beskrivelse av produktet."
      );

      return false;
    }

    if (
      !price.trim() ||
      Number.isNaN(parsedPrice) ||
      parsedPrice <= 0
    ) {
      Alert.alert(
        "Ugyldig pris",
        "Skriv inn en gyldig produktpris."
      );

      return false;
    }

    if (!expirationDate) {
      Alert.alert(
        "Manglende utløpsdato",
        "Velg datoen produktet skal forsvinne fra appen."
      );

      return false;
    }

    if (getEndOfDay(expirationDate).getTime() <= Date.now()) {
      Alert.alert(
        "Utløpsdatoen er passert",
        "Velg dagens dato eller en senere dato."
      );

      return false;
    }

    return true;
  }

  async function saveProduct() {
    if (
      !validateForm() ||
      isSaving ||
      isProcessingImage ||
      !expirationDate
    ) {
      return;
    }

    try {
      setIsSaving(true);

      const parsedPrice =
        convertPriceToNumber(price);

      const productDocument = await addDoc(
        collection(db, "products"),
        {
        name: name.trim(),
        description: description.trim(),
        price: parsedPrice,

        imageBase64,
        imageUrl: null,

        isActive: true,
        likeCount: 0,
        likedBy: [],
        openCount: 0,

        expiresAt: Timestamp.fromDate(
          getEndOfDay(expirationDate)
        ),

          createdAt: serverTimestamp(),
        }
      );

      let successMessage =
        "Produktet ble lagret og vil automatisk forsvinne etter utløpsdatoen.";

      try {
        const pushResult =
          await sendNewContentPushNotification({
            type: "product",
            itemId: productDocument.id,
            contentName: name.trim(),
          });

        if (pushResult.sent > 0) {
          successMessage += ` Push-varsel sendt til ${pushResult.sent} bruker${
            pushResult.sent === 1 ? "" : "e"
          }.`;
        } else {
          successMessage +=
            " Ingen brukere med aktive push-varsler ble funnet.";
        }
      } catch (notificationError) {
        console.error(
          "Produktet ble publisert, men push-varselet feilet:",
          notificationError
        );

        successMessage +=
          " Produktet er publisert, men push-varselet kunne ikke sendes.";
      }

      Alert.alert(
        "Produkt publisert",
        successMessage,
        [
          {
            text: "OK",
            onPress: resetForm,
          },
        ]
      );
    } catch (error) {
      console.error(
        "Feil ved lagring av produkt:",
        error
      );

      Alert.alert(
        "Kunne ikke publisere",
        "Det oppstod en feil under lagringen. Se terminalen for mer informasjon."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function resetForm() {
    if (isSaving || isProcessingImage) {
      return;
    }

    setName("");
    setDescription("");
    setPrice("");
    setExpirationDate(null);
    setShowDatePicker(false);
    setImageUri(null);
    setImageBase64(null);
  }

  const isBusy = isSaving || isProcessingImage;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={
        Platform.OS === "ios" ? "padding" : undefined
      }
      keyboardVerticalOffset={90}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={({ pressed }) => [
            styles.adminBackButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back-outline"
            size={21}
            color="#202020"
          />

          <Text style={styles.adminBackButtonText}>
            Tilbake til administrasjon
          </Text>
        </Pressable>

        <Text style={styles.title}>Nytt produkt</Text>

        <Text style={styles.subtitle}>
          Legg inn et produkt som automatisk
          forsvinner fra siden etter utløpsdatoen.
        </Text>

        <Text style={styles.label}>Produktbilde</Text>

        <Pressable
          style={({ pressed }) => [
            styles.imagePicker,
            pressed &&
              !isBusy &&
              styles.buttonPressed,
            isBusy && styles.disabledButton,
          ]}
          onPress={pickImage}
          disabled={isBusy}
        >
          {isProcessingImage ? (
            <View style={styles.imagePlaceholder}>
              <Ionicons
                name="hourglass-outline"
                size={42}
                color="#1F7A3D"
              />

              <Text style={styles.imagePickerTitle}>
                Behandler bildet...
              </Text>

              <Text style={styles.imagePickerText}>
                Bildet komprimeres før det lagres
              </Text>
            </View>
          ) : imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons
                name="image-outline"
                size={42}
                color="#1F7A3D"
              />

              <Text style={styles.imagePickerTitle}>
                Velg bilde
              </Text>

              <Text style={styles.imagePickerText}>
                Bildet komprimeres og lagres sammen
                med produktet
              </Text>
            </View>
          )}
        </Pressable>

        {imageUri && !isProcessingImage ? (
          <View style={styles.imageActions}>
            <Pressable
              style={styles.changeImageButton}
              onPress={pickImage}
              disabled={isBusy}
            >
              <Ionicons
                name="images-outline"
                size={18}
                color="#1F7A3D"
              />

              <Text style={styles.changeImageText}>
                Bytt bilde
              </Text>
            </Pressable>

            <Pressable
              style={styles.removeImageButton}
              onPress={() => {
                setImageUri(null);
                setImageBase64(null);
              }}
              disabled={isBusy}
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color="#B42318"
              />

              <Text style={styles.removeImageText}>
                Fjern bilde
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.infoBox}>
          <Ionicons
            name="checkmark-circle-outline"
            size={22}
            color="#1F7A3D"
          />

          <Text style={styles.infoText}>
            Bildet blir komprimert og lagret direkte
            i Firestore sammen med produktet.
          </Text>
        </View>

        <Text style={styles.label}>Produktnavn</Text>

        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="For eksempel: Protein-yoghurt"
          placeholderTextColor="#999999"
          autoCapitalize="sentences"
          editable={!isBusy}
        />

        <Text style={styles.label}>Beskrivelse</Text>

        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Skriv en kort beskrivelse av produktet"
          placeholderTextColor="#999999"
          multiline
          textAlignVertical="top"
          maxLength={200}
          editable={!isBusy}
        />

        <Text style={styles.characterCount}>
          {description.length}/200
        </Text>

        <Text style={styles.label}>Pris</Text>

        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          placeholder="For eksempel: 29,90"
          placeholderTextColor="#999999"
          keyboardType="decimal-pad"
          editable={!isBusy}
        />

        <Text style={styles.label}>
          Automatisk utløpsdato
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.dateButton,
            pressed && styles.dateButtonPressed,
            isBusy && styles.disabledButton,
          ]}
          onPress={() => setShowDatePicker(true)}
          disabled={isBusy}
        >
          <Ionicons
            name="calendar-outline"
            size={22}
            color="#1F7A3D"
          />

          <View style={styles.dateButtonContent}>
            <Text style={styles.dateButtonLabel}>
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
          <View style={styles.datePickerContainer}>
            <DateTimePicker
              value={expirationDate ?? getStartOfToday()}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "calendar"}
              minimumDate={getStartOfToday()}
              onChange={handleDateChange}
              themeVariant="light"
              accentColor="#1F7A3D"
            />
          </View>
        ) : null}

        <View style={styles.expirationInformationBox}>
          <Ionicons
            name="time-outline"
            size={22}
            color="#8A5A00"
          />

          <Text style={styles.expirationInformationText}>
            Produktet er synlig til kl. 23:59 på den
            valgte datoen. Deretter forsvinner det
            automatisk fra kundesiden.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            pressed &&
              !isBusy &&
              styles.buttonPressed,
            isBusy && styles.disabledButton,
          ]}
          onPress={() => void saveProduct()}
          disabled={isBusy}
        >
          <Ionicons
            name={
              isSaving
                ? "cloud-upload-outline"
                : isProcessingImage
                  ? "hourglass-outline"
                  : "checkmark-circle-outline"
            }
            size={22}
            color="#FFFFFF"
          />

          <Text style={styles.saveButtonText}>
            {isSaving
              ? "Publiserer..."
              : isProcessingImage
                ? "Behandler bilde..."
                : "Publiser produkt"}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.resetButton,
            pressed &&
              !isBusy &&
              styles.buttonPressed,
            isBusy && styles.disabledButton,
          ]}
          onPress={resetForm}
          disabled={isBusy}
        >
          <Text style={styles.resetButtonText}>
            Tøm skjemaet
          </Text>
        </Pressable>
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
    paddingBottom: 60,
  },

  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#171717",
  },

  subtitle: {
    marginTop: 7,
    marginBottom: 25,
    fontSize: 15,
    lineHeight: 22,
    color: "#666666",
  },

  label: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: "800",
    color: "#242424",
  },

  imagePicker: {
    height: 220,
    overflow: "hidden",
    backgroundColor: "#E3EDE5",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#8CB397",
    borderRadius: 16,
  },

  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  image: {
    width: "100%",
    height: "100%",
  },

  imagePickerTitle: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: "800",
    color: "#1F7A3D",
  },

  imagePickerText: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    color: "#66756A",
    textAlign: "center",
  },

  imageActions: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 22,
  },

  changeImageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  changeImageText: {
    color: "#1F7A3D",
    fontSize: 14,
    fontWeight: "800",
  },

  removeImageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  removeImageText: {
    color: "#B42318",
    fontSize: 14,
    fontWeight: "800",
  },

  infoBox: {
    marginTop: 18,
    padding: 14,
    backgroundColor: "#E7F4EA",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  infoText: {
    flex: 1,
    color: "#205C32",
    fontSize: 13,
    lineHeight: 19,
  },

  input: {
    minHeight: 54,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DDD9",
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    color: "#171717",
  },

  textArea: {
    minHeight: 120,
    paddingTop: 15,
    paddingBottom: 15,
  },

  characterCount: {
    marginTop: 6,
    color: "#888888",
    fontSize: 12,
    textAlign: "right",
  },

  dateButton: {
    minHeight: 72,
    paddingHorizontal: 15,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#D8DDD9",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  dateButtonPressed: {
    backgroundColor: "#F1F7F2",
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
    fontSize: 16,
    fontWeight: "800",
    color: "#202020",
  },

  datePlaceholder: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999999",
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

  expirationInformationBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FFF5DF",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  expirationInformationText: {
    flex: 1,
    color: "#745321",
    fontSize: 13,
    lineHeight: 19,
  },

  saveButton: {
    marginTop: 28,
    minHeight: 56,
    borderRadius: 13,
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

  resetButton: {
    marginTop: 12,
    minHeight: 54,
    borderWidth: 1.5,
    borderColor: "#1F7A3D",
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  resetButtonText: {
    color: "#1F7A3D",
    fontSize: 15,
    fontWeight: "800",
  },

  adminBackButton: {
    alignSelf: "flex-start",
    minHeight: 44,
    marginBottom: 20,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8DDD9",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  adminBackButtonText: {
    color: "#202020",
    fontSize: 14,
    fontWeight: "800",
  },

  buttonPressed: {
    opacity: 0.75,
  },

  disabledButton: {
    opacity: 0.6,
  },
});