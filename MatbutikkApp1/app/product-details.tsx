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
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const productId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isUpdatingLike, setIsUpdatingLike] = useState(false);

  useEffect(() => {
    if (!productId) {
      setErrorMessage("Vi fant ingen produkt-ID.");
      setIsLoading(false);
      return;
    }

    const productReference = doc(db, "products", productId);

    const unsubscribe = onSnapshot(
      productReference,
      (snapshot) => {
        if (!snapshot.exists()) {
          setProduct(null);
          setErrorMessage("Produktet finnes ikke lenger.");
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
          likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
          createdAt: data.createdAt ?? null,
        });

        setErrorMessage("");
        setIsLoading(false);
      },
      (error) => {
        console.error("Feil ved henting av produkt:", error);
        setErrorMessage("Kunne ikke hente produktet.");
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
    if (product?.imageBase64) return product.imageBase64;
    if (product?.imageUrl) return product.imageUrl;
    return null;
  }

  async function toggleLike() {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      Alert.alert("Logg inn", "Du må være logget inn for å like et produkt.");
      return;
    }

    if (!product || isUpdatingLike) return;

    try {
      setIsUpdatingLike(true);

      const productReference = doc(db, "products", product.id);

      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(productReference);

        if (!snapshot.exists()) {
          throw new Error("Produktet finnes ikke.");
        }

        const data = snapshot.data();
        const likedBy: string[] = Array.isArray(data.likedBy)
          ? data.likedBy
          : [];

        const hasLiked = likedBy.includes(currentUser.uid);
        const nextLikedBy = hasLiked
          ? likedBy.filter((uid) => uid !== currentUser.uid)
          : [...likedBy, currentUser.uid];

        transaction.update(productReference, {
          likedBy: nextLikedBy,
          likeCount: nextLikedBy.length,
        });
      });
    } catch (error) {
      console.error("Feil ved liking av produkt:", error);
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
            <ActivityIndicator size="large" color="#2166A5" />
            <Text style={styles.loadingText}>Henter produkt...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (!product || errorMessage) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle-outline" size={52} color="#A52626" />
            <Text style={styles.errorTitle}>Kunne ikke åpne produktet</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>

            <Pressable style={styles.errorBackButton} onPress={() => router.back()}>
              <Text style={styles.errorBackButtonText}>Gå tilbake</Text>
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

          <Text style={styles.topBarTitle}>Produktdetaljer</Text>

          <View style={styles.topBarPlaceholder} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.container}
        >
          <View style={styles.imageCard}>
            {productImage ? (
              <Image
                source={{ uri: productImage }}
                style={styles.image}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="cube-outline" size={72} color="#2166A5" />
                <Text style={styles.noImageText}>Ingen bilde</Text>
              </View>
            )}

            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NY</Text>
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
              <Text style={styles.likeCount}>{product.likeCount}</Text>
            </Pressable>
          </View>

          <View style={styles.contentCard}>
            <Text style={styles.title}>{product.name}</Text>

            <Text style={styles.description}>{product.description}</Text>

            <Text style={styles.price}>
              {formatPrice(product.price)} kr
            </Text>
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
    borderColor: "#D6E2EE",
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
    backgroundColor: "#E5EFF8",
  },

  noImageText: {
    marginTop: 10,
    color: "#52789A",
    fontSize: 14,
    fontWeight: "700",
  },

  newBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#2166A5",
  },

  newBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
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

  price: {
    marginTop: 22,
    color: "#1F7A3D",
    fontSize: 28,
    fontWeight: "900",
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
    backgroundColor: "#2166A5",
  },

  errorBackButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },

  buttonPressed: {
    opacity: 0.72,
  },
});