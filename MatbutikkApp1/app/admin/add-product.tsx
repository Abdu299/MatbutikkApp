import { Ionicons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { db } from "../../firebase/firebaseConfig";

const MAX_IMAGE_LENGTH = 750000;

export default function AddProductScreen() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [autoHideEnabled, setAutoHideEnabled] = useState(false);
  const [hideAt, setHideAt] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [errors, setErrors] = useState<{
    image?: string;
    name?: string;
    description?: string;
    price?: string;
    hideAt?: string;
  }>({});

  const [successMessage, setSuccessMessage] = useState("");
  const [submitError, setSubmitError] = useState("");

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

      const result = await ImagePicker.launchImageLibraryAsync({
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

      const manipulatedImage = await ImageManipulator.manipulateAsync(
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
        throw new Error("Bildet kunne ikke konverteres til Base64.");
      }

      const imageDataUrl = `data:image/jpeg;base64,${manipulatedImage.base64}`;

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
      console.error("Feil ved behandling av bilde:", error);

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

  function getSelectedHideDate() {
    if (!autoHideEnabled) {
      return null;
    }

    return hideAt;
  }

  function formatSelectableDate(date: Date) {
    return date.toLocaleDateString("nb-NO", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  const dateOptions = Array.from({ length: 90 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index + 1);
    date.setHours(23, 59, 59, 999);
    return date;
  });

  function validateForm() {
    const nextErrors: {
      image?: string;
      name?: string;
      description?: string;
      price?: string;
      hideAt?: string;
    } = {};

    const parsedPrice = Number(price.replace(",", ".").trim());

    if (!imageBase64) {
      nextErrors.image = "Velg et produktbilde.";
    }

    if (!name.trim()) {
      nextErrors.name = "Skriv inn produktnavn.";
    }

    if (!description.trim()) {
      nextErrors.description = "Skriv inn en beskrivelse.";
    }

    if (!price.trim()) {
      nextErrors.price = "Skriv inn pris.";
    } else if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      nextErrors.price = "Prisen må være et gyldig tall større enn 0.";
    }

    if (autoHideEnabled) {
      const selectedHideDate = getSelectedHideDate();

      if (!selectedHideDate) {
        nextErrors.hideAt = "Velg en dato.";
      } else {
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        if (selectedHideDate.getTime() <= endOfToday.getTime()) {
          nextErrors.hideAt = "Velg en dato etter i dag.";
        }
      }
    }

    setErrors(nextErrors);

    const hasErrors = Object.keys(nextErrors).length > 0;

    if (hasErrors) {
      Alert.alert(
        "Kontroller skjemaet",
        "Noen felt mangler eller inneholder ugyldige verdier. Se de røde meldingene i skjemaet."
      );
    }

    return !hasErrors;
  }

  async function saveProduct() {
    if (!validateForm() || isSaving || isProcessingImage) {
      return;
    }

    try {
      setSuccessMessage("");
      setSubmitError("");
      setIsSaving(true);

      const parsedPrice = Number(price.replace(",", "."));

      await addDoc(collection(db, "products"), {
        name: name.trim(),
        description: description.trim(),
        price: parsedPrice,

        imageBase64,
        imageUrl: null,

        isActive: true,
        likeCount: 0,
        likedBy: [],
        autoHideEnabled,
        hideAt:
          autoHideEnabled && getSelectedHideDate()
            ? Timestamp.fromDate(getSelectedHideDate()!)
            : null,
        createdAt: serverTimestamp(),
      });

      clearForm();
      setSubmitError("");
      setSuccessMessage("Produktet ble publisert og lagret.");
    } catch (error) {
      console.error("Feil ved lagring av produkt:", error);

      setSuccessMessage("");
      setSubmitError(
        "Kunne ikke publisere produktet. Kontroller at du er logget inn som admin og prøv igjen."
      );

      Alert.alert(
        "Kunne ikke publisere",
        "Produktet ble ikke lagret. Se feilmeldingen i skjemaet."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function clearForm() {
    setName("");
    setDescription("");
    setPrice("");
    setImageUri(null);
    setImageBase64(null);
    setAutoHideEnabled(false);
    setHideAt(null);
    setShowDatePicker(false);
    setErrors({});
  }

  const isBusy = isSaving || isProcessingImage;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
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
          <Ionicons name="arrow-back-outline" size={21} color="#202020" />
          <Text style={styles.adminBackButtonText}>
            Tilbake til administrasjon
          </Text>
        </Pressable>

        <Text style={styles.title}>Nytt produkt</Text>

        <Text style={styles.subtitle}>
          Legg inn informasjon og produktbilde som skal vises i butikken.
        </Text>

        <Text style={styles.label}>Produktbilde</Text>

        <Pressable
          style={({ pressed }) => [
            styles.imagePicker,
            pressed && !isBusy && styles.buttonPressed,
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

              <Text style={styles.imagePickerTitle}>Velg bilde</Text>

              <Text style={styles.imagePickerText}>
                Bildet komprimeres og lagres sammen med produktet
              </Text>
            </View>
          )}
        </Pressable>

        {imageUri && !isProcessingImage && (
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

              <Text style={styles.changeImageText}>Bytt bilde</Text>
            </Pressable>

            <Pressable
              style={styles.removeImageButton}
              onPress={() => {
                setImageUri(null);
                setImageBase64(null);
    setAutoHideEnabled(false);
    setHideAt(null);
    setShowDatePicker(false);
              }}
              disabled={isBusy}
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color="#B42318"
              />

              <Text style={styles.removeImageText}>Fjern bilde</Text>
            </Pressable>
          </View>
        )}

        {errors.image ? (
          <Text style={styles.errorText}>{errors.image}</Text>
        ) : null}

        <View style={styles.infoBox}>
          <Ionicons
            name="checkmark-circle-outline"
            size={22}
            color="#1F7A3D"
          />

          <Text style={styles.infoText}>
            Bildet blir komprimert og lagret direkte i Firestore sammen med
            produktet.
          </Text>
        </View>

        <Text style={styles.label}>Produktnavn</Text>

        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          value={name}
          onChangeText={(value) => {
            setName(value);
            if (errors.name) {
              setErrors((current) => ({ ...current, name: undefined }));
            }
          }}
          placeholder="For eksempel: Protein-yoghurt"
          placeholderTextColor="#999999"
          autoCapitalize="sentences"
          editable={!isBusy}
        />
        {errors.name ? (
          <Text style={styles.errorText}>{errors.name}</Text>
        ) : null}

        <Text style={styles.label}>Beskrivelse</Text>

        <TextInput
          style={[styles.input, styles.textArea, errors.description && styles.inputError]}
          value={description}
          onChangeText={(value) => {
            setDescription(value);
            if (errors.description) {
              setErrors((current) => ({
                ...current,
                description: undefined,
              }));
            }
          }}
          placeholder="Skriv en kort beskrivelse av produktet"
          placeholderTextColor="#999999"
          multiline
          textAlignVertical="top"
          maxLength={200}
          editable={!isBusy}
        />

        {errors.description ? (
          <Text style={styles.errorText}>{errors.description}</Text>
        ) : null}

        <Text style={styles.characterCount}>
          {description.length}/200
        </Text>

        <Text style={styles.label}>Pris</Text>

        <TextInput
          style={[styles.input, errors.price && styles.inputError]}
          value={price}
          onChangeText={(value) => {
            setPrice(value);
            if (errors.price) {
              setErrors((current) => ({
                ...current,
                price: undefined,
              }));
            }
          }}
          placeholder="For eksempel: 29,90"
          placeholderTextColor="#999999"
          keyboardType="decimal-pad"
          editable={!isBusy}
        />
        {errors.price ? (
          <Text style={styles.errorText}>{errors.price}</Text>
        ) : null}

        <View style={styles.autoHideCard}>
          <View style={styles.autoHideToggleRow}>
            <Switch
              value={autoHideEnabled}
              onValueChange={(value) => {
                setAutoHideEnabled(value);

                if (!value) {
                  setHideAt(null);
                                setShowDatePicker(false);
                  setErrors((current) => ({
                    ...current,
                    hideAt: undefined,
                  }));
                }
              }}
              disabled={isBusy}
              trackColor={{ false: "#D5DAD6", true: "#9CC9A8" }}
              thumbColor={autoHideEnabled ? "#1F7A3D" : "#FFFFFF"}
            />

            <View style={styles.autoHideTextContainer}>
              <Text style={styles.autoHideTitle}>
                Skjul automatisk på dato
              </Text>

              <Text style={styles.autoHideDescription}>
                Produktet blir satt som skjult når du åpner adminpanelet
                etter valgt dato.
              </Text>
            </View>
          </View>

          {autoHideEnabled ? (
            <View style={styles.dateSection}>
              <Text style={styles.dateLabel}>Skjul etter dato</Text>

              <Pressable
                style={[
                  styles.dateButton,
                  errors.hideAt && styles.inputError,
                ]}
                onPress={() => setShowDatePicker(true)}
                disabled={isBusy}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color="#1F7A3D"
                />

                <Text
                  style={[
                    styles.dateButtonText,
                    !hideAt && styles.datePlaceholderText,
                  ]}
                >
                  {hideAt
                    ? formatSelectableDate(hideAt)
                    : "Velg dato"}
                </Text>

                <Ionicons
                  name="chevron-down-outline"
                  size={20}
                  color="#6A6A6A"
                />
              </Pressable>

              {errors.hideAt ? (
                <Text style={styles.errorText}>{errors.hideAt}</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.dateModal}>
              <View style={styles.dateModalHeader}>
                <View style={styles.dateModalHeaderText}>
                  <Text style={styles.dateModalTitle}>Velg dato</Text>
                  <Text style={styles.dateModalSubtitle}>
                    Velg dagen produktet skal skjules.
                  </Text>
                </View>

                <Pressable
                  style={styles.closeModalButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Ionicons name="close" size={24} color="#333333" />
                </Pressable>
              </View>

              <ScrollView
                style={styles.dateList}
                showsVerticalScrollIndicator={false}
              >
                {dateOptions.map((date) => {
                  const isSelected =
                    hideAt !== null &&
                    hideAt.toDateString() === date.toDateString();

                  return (
                    <Pressable
                      key={date.toISOString()}
                      style={[
                        styles.dateOption,
                        isSelected && styles.dateOptionSelected,
                      ]}
                      onPress={() => {
                        setHideAt(date);
                        setShowDatePicker(false);

                        if (errors.hideAt) {
                          setErrors((current) => ({
                            ...current,
                            hideAt: undefined,
                          }));
                        }
                      }}
                    >
                      <View style={styles.dateOptionTextContainer}>
                        <Text
                          style={[
                            styles.dateOptionPrimary,
                            isSelected && styles.dateOptionPrimarySelected,
                          ]}
                        >
                          {date.toLocaleDateString("nb-NO", {
                            weekday: "long",
                            day: "2-digit",
                            month: "long",
                          })}
                        </Text>

                        <Text style={styles.dateOptionSecondary}>
                          {date.getFullYear()}
                        </Text>
                      </View>

                      {isSelected ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color="#1F7A3D"
                        />
                      ) : (
                        <Ionicons
                          name="chevron-forward-outline"
                          size={20}
                          color="#9A9A9A"
                        />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Pressable
                style={styles.cancelDateButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.cancelDateButtonText}>Avbryt</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {successMessage ? (
          <View style={styles.successBanner}>
            <Ionicons
              name="checkmark-circle-outline"
              size={22}
              color="#1F7A3D"
            />
            <Text style={styles.successBannerText}>
              {successMessage}
            </Text>
          </View>
        ) : null}

        {submitError ? (
          <View style={styles.submitErrorBanner}>
            <Ionicons
              name="alert-circle-outline"
              size={22}
              color="#B42318"
            />
            <Text style={styles.submitErrorBannerText}>
              {submitError}
            </Text>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            pressed && !isBusy && styles.buttonPressed,
            isBusy && styles.disabledButton,
          ]}
          onPress={saveProduct}
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
            pressed && !isBusy && styles.buttonPressed,
            isBusy && styles.disabledButton,
          ]}
          onPress={() => {
            clearForm();
            setSuccessMessage("");
            setSubmitError("");
          }}
          disabled={isBusy}
        >
          <Text style={styles.resetButtonText}>Tøm skjemaet</Text>
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

  inputError: {
    borderColor: "#C62828",
  },

  errorText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    color: "#C62828",
    fontWeight: "700",
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

  autoHideCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D8DDD9",
    backgroundColor: "#FFFFFF",
  },

  autoHideToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  checkbox: {
    width: 25,
    height: 25,
    marginTop: 1,
    marginRight: 12,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#A8B0AA",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  checkboxChecked: {
    borderColor: "#1F7A3D",
    backgroundColor: "#1F7A3D",
  },

  autoHideTextContainer: {
    flex: 1,
  },

  autoHideTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#242424",
  },

  autoHideDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: "#6F6F6F",
  },

  dateSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },

  dateLabel: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "800",
    color: "#242424",
  },

  dateButton: {
    minHeight: 54,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8DDD9",
    backgroundColor: "#FAFBFA",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  dateButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#202020",
  },

  datePlaceholderText: {
    color: "#8A8A8A",
    fontWeight: "500",
  },

  modalOverlay: {
    flex: 1,
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },

  dateModal: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "82%",
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
  },

  dateModalHeader: {
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  dateModalHeaderText: {
    flex: 1,
    paddingRight: 12,
  },

  dateModalTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: "#202020",
  },

  dateModalSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: "#707070",
  },

  closeModalButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F2F3F2",
    alignItems: "center",
    justifyContent: "center",
  },

  dateList: {
    maxHeight: 430,
  },

  dateOption: {
    minHeight: 62,
    marginBottom: 8,
    paddingHorizontal: 14,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E1E5E2",
    backgroundColor: "#FAFBFA",
    flexDirection: "row",
    alignItems: "center",
  },

  dateOptionSelected: {
    borderColor: "#1F7A3D",
    backgroundColor: "#EAF5ED",
  },

  dateOptionTextContainer: {
    flex: 1,
  },

  dateOptionPrimary: {
    fontSize: 15,
    fontWeight: "800",
    color: "#272727",
    textTransform: "capitalize",
  },

  dateOptionPrimarySelected: {
    color: "#1F7A3D",
  },

  dateOptionSecondary: {
    marginTop: 3,
    fontSize: 12,
    color: "#777777",
  },

  cancelDateButton: {
    minHeight: 50,
    marginTop: 10,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#D8DDD9",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelDateButtonText: {
    color: "#444444",
    fontSize: 15,
    fontWeight: "800",
  },

  successBanner: {
    marginTop: 18,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#E7F4EA",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  successBannerText: {
    flex: 1,
    color: "#205C32",
    fontSize: 14,
    fontWeight: "700",
  },

  submitErrorBanner: {
    marginTop: 18,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FBE5E5",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  submitErrorBannerText: {
    flex: 1,
    color: "#B42318",
    fontSize: 14,
    fontWeight: "700",
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