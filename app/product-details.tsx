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

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageBase64: string | null;
  imageUrl: string | null;
  isActive: boolean;
  likeCount: number;
  likedBy: string[];
  createdAt?: Timestamp | null;
};

export default function ProductDetailsScreen() {
  const parameters = useLocalSearchParams();

  const productId = Array.isArray(parameters.id)
    ? parameters.id[0]
    : parameters.id;

  const trackedProductId = useRef<string | null>(null);

  const [product, setProduct] =
    useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isUpdatingLike, setIsUpdatingLike] =
    useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);

  useEffect(() => {
    if (!productId) {
      return;
    }

    let isCancelled = false;

    const unsubscribeFromAuth = onAuthStateChanged(
      auth,
      (currentUser) => {
        if (!currentUser || isCancelled) {
          return;
        }

        const trackingKey = `${productId}:${currentUser.uid}`;

        if (trackedProductId.current === trackingKey) {
          return;
        }

        trackedProductId.current = trackingKey;

        const productReference = doc(
          db,
          "products",
          productId
        );

        void runTransaction(
          db,
          async (transaction) => {
            const snapshot =
              await transaction.get(
                productReference
              );

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

            transaction.update(productReference, {
              openedBy: nextOpenedBy,
              openCount: nextOpenedBy.length,
              lastOpenedAt: serverTimestamp(),
            });
          }
        ).catch((error) => {
          console.error(
            "Feil ved registrering av unik produktåpning:",
            error
          );
        });
      }
    );

    return () => {
      isCancelled = true;
      unsubscribeFromAuth();
    };
  }, [productId]);

  useEffect(() => {
    if (!productId) {
      setErrorMessage("Vi fant ingen produkt-ID.");
      setIsLoading(false);
      return;
    }

    const productReference = doc(
      db,
      "products",
      productId
    );

    const unsubscribe = onSnapshot(
      productReference,
      (snapshot) => {
        if (!snapshot.exists()) {
          setProduct(null);

          setErrorMessage(
            "Produktet finnes ikke, eller det kan ha blitt fjernet."
          );

          setIsLoading(false);
          return;
        }

        const data = snapshot.data();

        setProduct({
          id: snapshot.id,
          name: data.name ?? "",
          description: data.description ?? "",
          price: data.price ?? 0,
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
          "Feil ved henting av produkt:",
          error
        );

        setErrorMessage(
          "Kunne ikke hente informasjonen om produktet."
        );

        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [productId]);

  function formatPrice(price: number) {
    return price.toLocaleString("nb-NO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function getProductImage() {
    if (product?.imageBase64) {
      return product.imageBase64;
    }

    if (product?.imageUrl) {
      return product.imageUrl;
    }

    return null;
  }

  async function toggleLike() {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      Alert.alert(
        "Logg inn",
        "Du må være logget inn for å like et produkt."
      );

      return;
    }

    if (!product || isUpdatingLike) {
      return;
    }

    try {
      setIsUpdatingLike(true);

      const productReference = doc(
        db,
        "products",
        product.id
      );

      await runTransaction(
        db,
        async (transaction) => {
          const snapshot =
            await transaction.get(productReference);

          if (!snapshot.exists()) {
            throw new Error("Produktet finnes ikke.");
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

          transaction.update(productReference, {
            likedBy: nextLikedBy,
            likeCount: nextLikedBy.length,
          });
        }
      );
    } catch (error) {
      console.error(
        "Feil ved liking av produkt:",
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
              color="#2166A5"
            />

            <Text style={styles.loadingText}>
              Henter produktet...
            </Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (!product || errorMessage) {
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
              Kunne ikke åpne produktet
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

  const productImage = getProductImage();

  const hasLiked =
    auth.currentUser !== null &&
    product.likedBy.includes(auth.currentUser.uid);

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
            Produktdetaljer
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
              if (productImage) {
                setIsImageOpen(true);
              }
            }}
            disabled={!productImage}
          >
            {productImage ? (
              <Image
                source={{ uri: productImage }}
                style={styles.productImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons
                  name="cube-outline"
                  size={68}
                  color="#2166A5"
                />

                <Text style={styles.noImageText}>
                  Produktbilde
                </Text>
              </View>
            )}

            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>
                NY
              </Text>
            </View>

            {productImage ? (
              <View style={styles.expandBadge}>
                <Ionicons
                  name="expand-outline"
                  size={20}
                  color="#202020"
                />
              </View>
            ) : null}
          </Pressable>

          {productImage ? (
            <Text style={styles.imageHint}>
              Trykk på bildet for å åpne det i
              fullskjerm.
            </Text>
          ) : null}

          <View style={styles.titleSection}>
            <View style={styles.categoryBadge}>
              <Ionicons
                name="sparkles-outline"
                size={16}
                color="#2166A5"
              />

              <Text
                style={styles.categoryBadgeText}
              >
                Nytt produkt
              </Text>
            </View>

            <Text style={styles.title}>
              {product.name}
            </Text>
          </View>

          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Pris</Text>

            <Text style={styles.price}>
              {formatPrice(product.price)} kr
            </Text>

            <View style={styles.availabilityRow}>
              <View style={styles.availabilityIcon}>
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color="#1F7A3D"
                />
              </View>

              <View
                style={styles.availabilityContent}
              >
                <Text
                  style={styles.availabilityTitle}
                >
                  Nytt i butikken
                </Text>

                <Text
                  style={styles.availabilityText}
                >
                  Produktet er nylig lagt til i
                  vareutvalget.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.informationCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={21}
                  color="#2166A5"
                />
              </View>

              <Text style={styles.sectionTitle}>
                Produktbeskrivelse
              </Text>
            </View>

            <Text style={styles.description}>
              {product.description}
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
                ? "Du liker dette produktet"
                : "Lik produktet"}
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
                {product.likeCount}
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

              {productImage ? (
                <Image
                  source={{ uri: productImage }}
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

  productImage: {
    width: "100%",
    height: "100%",
  },

  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5EFF8",
  },

  noImageText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "800",
    color: "#52789A",
  },

  newBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#2166A5",
  },

  newBadgeText: {
    fontSize: 13,
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
    backgroundColor: "#E5EFF8",
  },

  categoryBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2166A5",
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

  price: {
    marginTop: 4,
    fontSize: 32,
    fontWeight: "900",
    color: "#1F7A3D",
  },

  availabilityRow: {
    marginTop: 18,
    paddingTop: 17,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  availabilityIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF4EC",
  },

  availabilityContent: {
    flex: 1,
  },

  availabilityTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#303030",
  },

  availabilityText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    color: "#707070",
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
    backgroundColor: "#E5EFF8",
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
    backgroundColor: "#2166A5",
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