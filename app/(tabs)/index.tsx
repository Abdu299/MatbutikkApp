import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  Timestamp,
  where,
} from "firebase/firestore";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  auth,
  db,
} from "../../firebase/firebaseConfig";

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
  expiresAt: Timestamp | null;
  createdAt?: Timestamp | null;
};

export default function OffersScreen() {
  const [allOffers, setAllOffers] = useState<
    Offer[]
  >([]);

  const [currentTime, setCurrentTime] = useState(
    Date.now()
  );

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState("");

  const [updatingLikeId, setUpdatingLikeId] =
    useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60_000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const offersQuery = query(
      collection(db, "offers"),
      where("isActive", "==", true),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      offersQuery,
      (snapshot) => {
        const loadedOffers: Offer[] =
          snapshot.docs.map((document) => {
            const data = document.data();

            return {
              id: document.id,
              title: data.title ?? "",
              description: data.description ?? "",
              oldPrice: data.oldPrice ?? 0,
              offerPrice: data.offerPrice ?? 0,
              discountPercentage:
                data.discountPercentage ?? 0,
              duration: data.duration ?? "",
              imageBase64:
                data.imageBase64 ?? null,
              imageUrl: data.imageUrl ?? null,
              isActive: data.isActive ?? true,
              likeCount: data.likeCount ?? 0,
              likedBy: Array.isArray(data.likedBy)
                ? data.likedBy
                : [],
              expiresAt:
                data.expiresAt instanceof Timestamp
                  ? data.expiresAt
                  : null,
              createdAt: data.createdAt ?? null,
            };
          });

        setAllOffers(loadedOffers);
        setIsLoading(false);
        setErrorMessage("");
        setCurrentTime(Date.now());
      },
      (error) => {
        console.error(
          "Feil ved henting av tilbud:",
          error
        );

        setErrorMessage(
          "Kunne ikke hente tilbudene."
        );

        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const offers = useMemo(() => {
    return allOffers.filter((offer) => {
      if (!offer.expiresAt) {
        return true;
      }

      return offer.expiresAt.toMillis() > currentTime;
    });
  }, [allOffers, currentTime]);

  function formatPrice(price: number) {
    return price.toLocaleString("nb-NO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatExpirationDate(
    expiration: Timestamp
  ) {
    return expiration.toDate().toLocaleDateString(
      "nb-NO",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  }

  function openOfferDetails(offerId: string) {
    router.push({
      pathname: "/offer-details",
      params: {
        id: offerId,
      },
    });
  }

  async function toggleLike(offer: Offer) {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      Alert.alert(
        "Logg inn",
        "Du må være logget inn for å like et tilbud."
      );

      return;
    }

    if (updatingLikeId) {
      return;
    }

    try {
      setUpdatingLikeId(offer.id);

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
            throw new Error(
              "Tilbudet finnes ikke."
            );
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
      setUpdatingLikeId(null);
    }
  }

  function getOfferImage(offer: Offer) {
    if (offer.imageBase64) {
      return offer.imageBase64;
    }

    if (offer.imageUrl) {
      return offer.imageUrl;
    }

    return null;
  }

  if (isLoading) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={["top"]}
      >
        <View style={styles.centerContainer}>
          <ActivityIndicator
            size="large"
            color="#1F7A3D"
          />

          <Text style={styles.loadingText}>
            Henter tilbud...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
      <FlatList
        data={offers}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.container,
          offers.length === 0 &&
            styles.emptyListContainer,
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.badge}>
              <Ionicons
                name="pricetag-outline"
                size={17}
                color="#1F7A3D"
              />

              <Text style={styles.badgeText}>
                Ukens tilbud
              </Text>
            </View>

            <Text style={styles.title}>
              Gode tilbud
            </Text>

            <Text style={styles.subtitle}>
              Oppdag de nyeste tilbudene og spar
              penger på handleturen.
            </Text>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={21}
                  color="#A52626"
                />

                <Text style={styles.errorText}>
                  {errorMessage}
                </Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="pricetag-outline"
              size={55}
              color="#8B968E"
            />

            <Text style={styles.emptyTitle}>
              Ingen aktive tilbud
            </Text>

            <Text style={styles.emptyText}>
              Nye tilbud vil vises her når de
              publiseres av butikken.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const offerImage = getOfferImage(item);

          const hasLiked =
            auth.currentUser !== null &&
            item.likedBy.includes(
              auth.currentUser.uid
            );

          return (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
              onPress={() =>
                openOfferDetails(item.id)
              }
              accessibilityRole="button"
              accessibilityLabel={`Åpne detaljer for ${item.title}`}
            >
              <View style={styles.imageContainer}>
                {offerImage ? (
                  <Image
                    source={{ uri: offerImage }}
                    style={styles.offerImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={styles.imagePlaceholder}
                  >
                    <Ionicons
                      name="basket-outline"
                      size={48}
                      color="#1F7A3D"
                    />

                    <Text style={styles.noImageText}>
                      Tilbudsbilde
                    </Text>
                  </View>
                )}

                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>
                    -{item.discountPercentage}%
                  </Text>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.likeButton,
                    pressed &&
                      styles.likeButtonPressed,
                  ]}
                  onPress={(event) => {
                    event.stopPropagation();
                    void toggleLike(item);
                  }}
                  disabled={
                    updatingLikeId === item.id
                  }
                >
                  {updatingLikeId === item.id ? (
                    <ActivityIndicator
                      size="small"
                      color="#D62828"
                    />
                  ) : (
                    <>
                      <Ionicons
                        name={
                          hasLiked
                            ? "heart"
                            : "heart-outline"
                        }
                        size={23}
                        color="#D62828"
                      />

                      <Text style={styles.likeCount}>
                        {item.likeCount}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>

              <View style={styles.cardContent}>
                <Text style={styles.offerTitle}>
                  {item.title}
                </Text>

                <Text
                  style={styles.description}
                  numberOfLines={3}
                >
                  {item.description}
                </Text>

                <View style={styles.priceContainer}>
                  <Text style={styles.offerPrice}>
                    {formatPrice(item.offerPrice)} kr
                  </Text>

                  <Text style={styles.oldPrice}>
                    {formatPrice(item.oldPrice)} kr
                  </Text>
                </View>

                <View style={styles.durationRow}>
                  <Ionicons
                    name="time-outline"
                    size={17}
                    color="#666666"
                  />

                  <Text style={styles.durationText}>
                    {item.duration}
                  </Text>
                </View>

                {item.expiresAt ? (
                  <View style={styles.expirationRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={17}
                      color="#8A5A00"
                    />

                    <Text
                      style={styles.expirationText}
                    >
                      Utløper{" "}
                      {formatExpirationDate(
                        item.expiresAt
                      )}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.detailsRow}>
                  <Text style={styles.detailsText}>
                    Se detaljer
                  </Text>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#1F7A3D"
                  />
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F7F5",
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 110,
  },

  emptyListContainer: {
    flexGrow: 1,
  },

  header: {
    marginBottom: 24,
  },

  badge: {
    alignSelf: "flex-start",
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
    marginTop: 18,
    fontSize: 32,
    fontWeight: "900",
    color: "#171717",
  },

  subtitle: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 23,
    color: "#6A6A6A",
  },

  card: {
    marginBottom: 18,
    overflow: "hidden",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E5E2",
  },

  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },

  imageContainer: {
    height: 190,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#E3EDE5",
  },

  offerImage: {
    width: "100%",
    height: "100%",
  },

  imagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  noImageText: {
    marginTop: 9,
    fontSize: 13,
    fontWeight: "700",
    color: "#5E7764",
  },

  discountBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    minWidth: 58,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#D62828",
    alignItems: "center",
  },

  discountText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },

  likeButton: {
    position: "absolute",
    top: 13,
    right: 13,
    minWidth: 58,
    height: 42,
    paddingHorizontal: 11,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.95)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  likeButtonPressed: {
    opacity: 0.72,
  },

  likeCount: {
    fontSize: 14,
    fontWeight: "900",
    color: "#D62828",
  },

  cardContent: {
    padding: 17,
  },

  offerTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#202020",
  },

  description: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
    color: "#686868",
  },

  priceContainer: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },

  offerPrice: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1F7A3D",
  },

  oldPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#8A8A8A",
    textDecorationLine: "line-through",
  },

  durationRow: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  durationText: {
    flex: 1,
    fontSize: 13,
    color: "#666666",
  },

  expirationRow: {
    marginTop: 10,
    padding: 11,
    borderRadius: 11,
    backgroundColor: "#FFF5DF",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  expirationText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    color: "#8A5A00",
  },

  detailsRow: {
    marginTop: 15,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  detailsText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1F7A3D",
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

  emptyContainer: {
    flex: 1,
    minHeight: 360,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  emptyTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: "900",
    color: "#303030",
  },

  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: "#737373",
  },

  errorBox: {
    marginTop: 18,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FBE5E5",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  errorText: {
    flex: 1,
    color: "#A52626",
    fontSize: 13,
    lineHeight: 19,
  },
});