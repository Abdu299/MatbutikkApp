import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import {
    doc,
    onSnapshot,
    runTransaction,
    Timestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
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
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const offerId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [offer, setOffer] = useState<Offer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isUpdatingLike, setIsUpdatingLike] = useState(false);

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
          setErrorMessage("Tilbudet finnes ikke lenger.");
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
          discountPercentage: data.discountPercentage ?? 0,
          duration: data.duration ?? "",
          imageBase64: data.imageBase64 ?? null,
          imageUrl: data.imageUrl ?? null,
          isActive: data.isActive ?? true,
          likeCount: data.likeCount ?? 0,
          likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
          createdAt: data.createdAt ?? null,
        });

        setErrorMessage("");
        setIsLoading(false);
      },
      (error) => {
        console.error("Feil ved henting av tilbud:", error);
        setErrorMessage("Kunne ikke hente tilbudet.");
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
    if (offer?.imageBase64) return offer.imageBase64;
    if (offer?.imageUrl) return offer.imageUrl;
    return null;
  }

  async function toggleLike() {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      Alert.alert("Logg inn", "Du må være logget inn for å like et tilbud.");
      return;
    }

    if (!offer || isUpdatingLike) return;

    try {
      setIsUpdatingLike(true);

      const offerReference = doc(db, "offers", offer.id);

      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(offerReference);

        if (!snapshot.exists()) {
          throw new Error("Tilbudet finnes ikke.");
        }

        const data = snapshot.data();
        const likedBy: string[] = Array.isArray(data.likedBy)
          ? data.likedBy
          : [];

        const hasLiked = likedBy.includes(currentUser.uid);
        const nextLikedBy = hasLiked
          ? likedBy.filter((uid) => uid !== currentUser.uid)
          : [...likedBy, currentUser.uid];

        transaction.update(offerReference, {
          likedBy: nextLikedBy,
          likeCount: nextLikedBy.length,
        });
      });
    } catch (error) {
      console.error("Feil ved liking av tilbud:", error);
      Alert.alert("Kunne ikke oppdatere", "Prøv igjen om litt.");
    } finally {
      setIsUpdatingLike(false);
    }
  }

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#1F7A3D" />
            <Text style={styles.loadingText}>Henter tilbud...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (!offer || errorMessage) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle-outline" size={52} color="#A52626" />
            <Text style={styles.errorTitle}>Kunne ikke åpne tilbudet</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>

            <Pressable style={styles.errorBackButton} onPress={() => router.back()}>
              <Text style={styles.errorBackButtonText}>Gå tilbake</Text>
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

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#202020" />
          </Pressable>

          <Text style={styles.topBarTitle}>Tilbudsdetaljer</Text>

          <View style={styles.topBarPlaceholder} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.container}
        >
          <View style={styles.imageCard}>
            {offerImage ? (
              <Image
                source={{ uri: offerImage }}
                style={styles.image}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="basket-outline" size={72} color="#1F7A3D" />
                <Text style={styles.noImageText}>Ingen bilde</Text>
              </View>
            )}

            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>
                -{offer.discountPercentage}%
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.likeButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={toggleLike}
              disabled={isUpdatingLike}
            >
              <Ionicons
                name={hasLiked ? "heart" : "heart-outline"}
                size={25}
                color="#D62828"
              />
              <Text style={styles.likeCount}>{offer.likeCount}</Text>
            </Pressable>
          </View>

          <View style={styles.contentCard}>
            <Text style={styles.title}>{offer.title}</Text>

            <Text style={styles.description}>{offer.description}</Text>

            <View style={styles.priceRow}>
              <Text style={styles.offerPrice}>
                {formatPrice(offer.offerPrice)} kr
              </Text>

              <Text style={styles.oldPrice}>
                {formatPrice(offer.oldPrice)} kr
              </Text>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="time-outline" size={22} color="#1F7A3D" />

              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Tilbudet gjelder</Text>
                <Text style={styles.infoValue}>{offer.duration}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
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
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E3E5E3",
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  topBarTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "900",
    color: "#202020",
  },

  topBarPlaceholder: {
    width: 42,
  },

  container: {
    padding: 18,
    paddingBottom: 50,
  },

  imageCard: {
    height: 390,
    position: "relative",
    overflow: "hidden",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#DDE3DE",
    backgroundColor: "#FFFFFF",
  },

  image: {
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
    marginTop: 10,
    color: "#5E7764",
    fontSize: 14,
    fontWeight: "700",
  },

  discountBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#D62828",
  },

  discountText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },

  likeButton: {
    position: "absolute",
    top: 14,
    right: 14,
    minWidth: 66,
    height: 48,
    paddingHorizontal: 13,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.96)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  likeCount: {
    color: "#D62828",
    fontSize: 15,
    fontWeight: "900",
  },

  contentCard: {
    marginTop: 18,
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E5E2",
  },

  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#171717",
  },

  description: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 24,
    color: "#666666",
  },

  priceRow: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  offerPrice: {
    color: "#1F7A3D",
    fontSize: 28,
    fontWeight: "900",
  },

  oldPrice: {
    color: "#8A8A8A",
    fontSize: 17,
    fontWeight: "700",
    textDecorationLine: "line-through",
  },

  infoBox: {
    marginTop: 22,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  infoTextContainer: {
    flex: 1,
  },

  infoLabel: {
    color: "#777777",
    fontSize: 12,
    fontWeight: "700",
  },

  infoValue: {
    marginTop: 2,
    color: "#303030",
    fontSize: 15,
    fontWeight: "800",
  },

  centerContainer: {
    flex: 1,
    paddingHorizontal: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    color: "#666666",
    fontSize: 14,
  },

  errorTitle: {
    marginTop: 14,
    color: "#202020",
    fontSize: 22,
    fontWeight: "900",
  },

  errorText: {
    marginTop: 8,
    color: "#707070",
    fontSize: 14,
    textAlign: "center",
  },

  errorBackButton: {
    marginTop: 22,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 13,
    backgroundColor: "#1F7A3D",
  },

  errorBackButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },

  buttonPressed: {
    opacity: 0.72,
  },
});