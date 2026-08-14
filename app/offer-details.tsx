import { Ionicons } from "@expo/vector-icons";
import {
  router,
  Stack,
  useLocalSearchParams,
} from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { auth, db } from "../firebase/firebaseConfig";

type Offer = {
  id: string;
  title: string;
  description: string;
  oldPrice: number;
  offerPrice: number;
  discountPercentage: number;
  duration: string;
  imageBase64: string | null;
  imageUrl: string | null;
  isActive: boolean;
  likeCount: number;
  likedBy: string[];
  createdAt?: Timestamp | null;
};

export default function OfferDetailsScreen() {
  const parameters = useLocalSearchParams();

  const offerId = Array.isArray(parameters.id)
    ? parameters.id[0]
    : parameters.id;

  const trackedOfferId = useRef<string | null>(null);

  const [offer, setOffer] = useState<Offer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isUpdatingLike, setIsUpdatingLike] =
    useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);

  useEffect(() => {
    if (!offerId) {
      return;
    }

    let isCancelled = false;

    const unsubscribeFromAuth = onAuthStateChanged(
      auth,
      (currentUser) => {
        if (!currentUser || isCancelled) {
          return;
        }

        const trackingKey = `${offerId}:${currentUser.uid}`;

        if (trackedOfferId.current === trackingKey) {
          return;
        }

        trackedOfferId.current = trackingKey;

        const offerReference = doc(
          db,
          "offers",
          offerId
        );

        void runTransaction(
          db,
          async (transaction) => {
            const snapshot =
              await transaction.get(offerReference);

            if (!snapshot.exists()) {
              return;
            }

            const data = snapshot.data();

            const openedBy: string[] = Array.isArray(
              data.openedBy
            )
              ? data.openedBy.filter(
                  (userId): userId is string =>
                    typeof userId === "string"
                )
              : [];

            if (openedBy.includes(currentUser.uid)) {
              return;
            }

            const nextOpenedBy = [
              ...openedBy,
              currentUser.uid,
            ];

            transaction.update(offerReference, {
              openedBy: nextOpenedBy,
              openCount: nextOpenedBy.length,
              lastOpenedAt: serverTimestamp(),
            });
          }
        ).catch((error) => {
          console.error(
            "Feil ved registrering av unik tilbudsåpning:",
            error
          );
        });
      }
    );

    return () => {
      isCancelled = true;
      unsubscribeFromAuth();
    };
  }, [offerId]);

  useEffect(() => {
    if (!offerId) {
      setErrorMessage("Vi fant ingen tilbuds-ID.");
      setIsLoading(false);
      return;
    }

    const offerReference = doc(db, "offers", offerId);

    const unsubscribe = onSnapshot(
      offerReference,
      (snapshot) => {
        if (!snapshot.exists()) {
          setOffer(null);

          setErrorMessage(
            "Tilbudet finnes ikke, eller det kan ha blitt fjernet."
          );

          setIsLoading(false);
          return;
        }

        const data = snapshot.data();

        setOffer({
          id: snapshot.id,
          title: data.title ?? "",
          description: data.description ?? "",
          oldPrice: data.oldPrice ?? 0,
          offerPrice: data.offerPrice ?? 0,
          discountPercentage:
            data.discountPercentage ?? 0,
          duration: data.duration ?? "",
          imageBase64: data.imageBase64 ?? null,
          imageUrl: data.imageUrl ?? null,
          isActive: data.isActive ?? true,
          likeCount: data.likeCount ?? 0,
          likedBy: Array.isArray(data.likedBy)
            ? data.likedBy
            : [],
          createdAt: data.createdAt ?? null,
        });

        setErrorMessage("");
        setIsLoading(false);
      },
      (error) => {
        console.error(
          "Feil ved henting av tilbud:",
          error
        );

        setErrorMessage(
          "Kunne ikke hente informasjonen om tilbudet."
        );

        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [offerId]);

  function formatPrice(price: number) {
    return price.toLocaleString("nb-NO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function getOfferImage() {
    if (offer?.imageBase64) {
      return offer.imageBase64;
    }

    if (offer?.imageUrl) {
      return offer.imageUrl;
    }

    return null;
  }

  async function toggleLike() {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      Alert.alert(
        "Logg inn",
        "Du må være logget inn for å like et tilbud."
      );

      return;
    }

    if (!offer || isUpdatingLike) {
      return;
    }

    try {
      setIsUpdatingLike(true);

      const offerReference = doc(
        db,
        "offers",
        offer.id
      );

      await runTransaction(
        db,
        async (transaction) => {
          const snapshot =
            await transaction.get(offerReference);

          if (!snapshot.exists()) {
            throw new Error("Tilbudet finnes ikke.");
          }

          const data = snapshot.data();

          const likedBy: string[] = Array.isArray(
            data.likedBy
          )
            ? data.likedBy
            : [];

          const hasLiked = likedBy.includes(
            currentUser.uid
          );

          const nextLikedBy = hasLiked
            ? likedBy.filter(
                (uid) => uid !== currentUser.uid
              )
            : [...likedBy, currentUser.uid];

          transaction.update(offerReference, {
            likedBy: nextLikedBy,
            likeCount: nextLikedBy.length,
          });
        }
      );
    } catch (error) {
      console.error(
        "Feil ved liking av tilbud:",
        error
      );

      Alert.alert(
        "Kunne ikke oppdatere",
        "Prøv igjen om litt."
      );
    } finally {
      setIsUpdatingLike(false);
    }
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
              color="#1F7A3D"
            />

            <Text style={styles.loadingText}>
              Henter tilbudet...
            </Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (!offer || errorMessage) {
    return (
      <>
        <Stack.Screen
          options={{ headerShown: false }}
        />

        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <View style={styles.errorIcon}>
              <Ionicons
                name="alert-circle-outline"
                size={46}
                color="#A52626"
              />
            </View>

            <Text style={styles.errorTitle}>
              Kunne ikke åpne tilbudet
            </Text>

            <Text style={styles.errorDescription}>
              {errorMessage}
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.backToListButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.back()}
            >
              <Ionicons
                name="arrow-back-outline"
                size={20}
                color="#FFFFFF"
              />

              <Text
                style={styles.backToListButtonText}
              >
                Gå tilbake
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const offerImage = getOfferImage();

  const hasLiked =
    auth.currentUser !== null &&
    offer.likedBy.includes(auth.currentUser.uid);

  const savedAmount = Math.max(
    offer.oldPrice - offer.offerPrice,
    0
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView
        style={styles.safeArea}
        edges={["top", "bottom"]}
      >
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Gå tilbake"
          >
            <Ionicons
              name="arrow-back"
              size={23}
              color="#202020"
            />
          </Pressable>

          <Text style={styles.topBarTitle}>
            Tilbudsdetaljer
          </Text>

          <View style={styles.topBarPlaceholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            style={styles.imageContainer}
            onPress={() => {
              if (offerImage) {
                setIsImageOpen(true);
              }
            }}
            disabled={!offerImage}
          >
            {offerImage ? (
              <Image
                source={{ uri: offerImage }}
                style={styles.offerImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons
                  name="basket-outline"
                  size={68}
                  color="#1F7A3D"
                />

                <Text style={styles.noImageText}>
                  Tilbudsbilde
                </Text>
              </View>
            )}

            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>
                -{offer.discountPercentage}%
              </Text>
            </View>

            {offerImage ? (
              <View style={styles.expandBadge}>
                <Ionicons
                  name="expand-outline"
                  size={20}
                  color="#202020"
                />
              </View>
            ) : null}
          </Pressable>

          {offerImage ? (
            <Text style={styles.imageHint}>
              Trykk på bildet for å åpne det i
              fullskjerm.
            </Text>
          ) : null}

          <View style={styles.titleSection}>
            <View style={styles.categoryBadge}>
              <Ionicons
                name="pricetag-outline"
                size={16}
                color="#1F7A3D"
              />

              <Text
                style={styles.categoryBadgeText}
              >
                Tilbud
              </Text>
            </View>

            <Text style={styles.title}>
              {offer.title}
            </Text>
          </View>

          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>
              Tilbudspris
            </Text>

            <Text style={styles.offerPrice}>
              {formatPrice(offer.offerPrice)} kr
            </Text>

            <View style={styles.originalPriceRow}>
              <Text
                style={styles.originalPriceLabel}
              >
                Ordinær pris
              </Text>

              <Text style={styles.oldPrice}>
                {formatPrice(offer.oldPrice)} kr
              </Text>
            </View>

            {savedAmount > 0 ? (
              <View style={styles.savingsBox}>
                <Ionicons
                  name="wallet-outline"
                  size={21}
                  color="#1F7A3D"
                />

                <View style={styles.savingsContent}>
                  <Text style={styles.savingsLabel}>
                    Du sparer
                  </Text>

                  <Text style={styles.savingsValue}>
                    {formatPrice(savedAmount)} kr
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.informationCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={21}
                  color="#1F7A3D"
                />
              </View>

              <Text style={styles.sectionTitle}>
                Beskrivelse
              </Text>
            </View>

            <Text style={styles.description}>
              {offer.description}
            </Text>
          </View>

          <View style={styles.informationCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name="time-outline"
                  size={21}
                  color="#1F7A3D"
                />
              </View>

              <Text style={styles.sectionTitle}>
                Tilbudets varighet
              </Text>
            </View>

            <Text style={styles.durationText}>
              {offer.duration}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.likeButton,
              hasLiked && styles.likedButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => void toggleLike()}
            disabled={isUpdatingLike}
          >
            {isUpdatingLike ? (
              <ActivityIndicator
                size="small"
                color={
                  hasLiked ? "#FFFFFF" : "#D62828"
                }
              />
            ) : (
              <Ionicons
                name={
                  hasLiked
                    ? "heart"
                    : "heart-outline"
                }
                size={23}
                color={
                  hasLiked ? "#FFFFFF" : "#D62828"
                }
              />
            )}

            <Text
              style={[
                styles.likeButtonText,
                hasLiked &&
                  styles.likedButtonText,
              ]}
            >
              {hasLiked
                ? "Du liker dette tilbudet"
                : "Lik tilbudet"}
            </Text>

            <View
              style={[
                styles.likeCountBadge,
                hasLiked &&
                  styles.likedCountBadge,
              ]}
            >
              <Text
                style={[
                  styles.likeCountText,
                  hasLiked &&
                    styles.likedCountText,
                ]}
              >
                {offer.likeCount}
              </Text>
            </View>
          </Pressable>
        </ScrollView>

        <Modal
          visible={isImageOpen}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() =>
            setIsImageOpen(false)
          }
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsImageOpen(false)}
          >
            <Pressable
              style={styles.modalContent}
              onPress={(event) =>
                event.stopPropagation()
              }
            >
              <Pressable
                style={({ pressed }) => [
                  styles.modalCloseButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() =>
                  setIsImageOpen(false)
                }
              >
                <Ionicons
                  name="close"
                  size={25}
                  color="#FFFFFF"
                />
              </Pressable>

              {offerImage ? (
                <Image
                  source={{ uri: offerImage }}
                  style={styles.fullscreenImage}
                  resizeMode="contain"
                />
              ) : null}
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7F5",
  },

  topBar: {
    height: 58,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E8E5",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F3F1",
  },

  topBarTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#202020",
  },

  topBarPlaceholder: {
    width: 42,
  },

  scrollView: {
    flex: 1,
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 44,
  },

  imageContainer: {
    height: 340,
    position: "relative",
    overflow: "hidden",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E5E2",
  },

  offerImage: {
    width: "100%",
    height: "100%",
  },

  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E3EDE5",
  },

  noImageText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "800",
    color: "#5E7764",
  },

  discountBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    minWidth: 70,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    alignItems: "center",
    backgroundColor: "#D62828",
  },

  discountText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  expandBadge: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 43,
    height: 43,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
  },

  imageHint: {
    marginTop: 9,
    fontSize: 12,
    textAlign: "center",
    color: "#777777",
  },

  titleSection: {
    marginTop: 25,
  },

  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#E3EDE5",
  },

  categoryBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1F7A3D",
  },

  title: {
    marginTop: 15,
    fontSize: 29,
    lineHeight: 36,
    fontWeight: "900",
    color: "#171717",
  },

  priceCard: {
    marginTop: 20,
    padding: 20,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E5E2",
  },

  priceLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#737373",
  },

  offerPrice: {
    marginTop: 4,
    fontSize: 32,
    fontWeight: "900",
    color: "#1F7A3D",
  },

  originalPriceRow: {
    marginTop: 13,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  originalPriceLabel: {
    fontSize: 14,
    color: "#737373",
  },

  oldPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: "#888888",
    textDecorationLine: "line-through",
  },

  savingsBox: {
    marginTop: 17,
    padding: 14,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: "#EAF4EC",
  },

  savingsContent: {
    flex: 1,
  },

  savingsLabel: {
    fontSize: 12,
    color: "#5E6F62",
  },

  savingsValue: {
    marginTop: 2,
    fontSize: 17,
    fontWeight: "900",
    color: "#1F7A3D",
  },

  informationCard: {
    marginTop: 17,
    padding: 19,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E5E2",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF4EC",
  },

  sectionTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "900",
    color: "#262626",
  },

  description: {
    marginTop: 16,
    fontSize: 15,
    lineHeight: 24,
    color: "#626262",
  },

  durationText: {
    marginTop: 16,
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "700",
    color: "#505050",
  },

  likeButton: {
    minHeight: 58,
    marginTop: 20,
    paddingHorizontal: 17,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#D62828",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
  },

  likedButton: {
    backgroundColor: "#D62828",
  },

  likeButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
    color: "#D62828",
  },

  likedButtonText: {
    color: "#FFFFFF",
  },

  likeCountBadge: {
    minWidth: 34,
    height: 30,
    paddingHorizontal: 9,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FBE5E5",
  },

  likedCountBadge: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },

  likeCountText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#D62828",
  },

  likedCountText: {
    color: "#FFFFFF",
  },

  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666666",
  },

  errorContainer: {
    flex: 1,
    paddingHorizontal: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  errorIcon: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FBE5E5",
  },

  errorTitle: {
    marginTop: 21,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    color: "#292929",
  },

  errorDescription: {
    marginTop: 9,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    color: "#6D6D6D",
  },

  backToListButton: {
    minHeight: 50,
    marginTop: 25,
    paddingHorizontal: 22,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: "#1F7A3D",
  },

  backToListButtonText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  buttonPressed: {
    opacity: 0.75,
  },

  modalBackdrop: {
    flex: 1,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.93)",
  },

  modalContent: {
    width: "100%",
    height: "88%",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },

  fullscreenImage: {
    width: "100%",
    height: "100%",
  },

  modalCloseButton: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 2,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
});