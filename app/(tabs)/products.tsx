import { Ionicons } from "@expo/vector-icons";
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
import { useEffect, useState } from "react";
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

import { auth, db } from "../../firebase/firebaseConfig";

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

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [updatingLikeId, setUpdatingLikeId] = useState<string | null>(null);

  useEffect(() => {
    const productsQuery = query(
      collection(db, "products"),
      where("isActive", "==", true),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      productsQuery,
      (snapshot) => {
        const loadedProducts: Product[] = snapshot.docs.map((document) => {
          const data = document.data();

          return {
            id: document.id,
            name: data.name ?? "",
            description: data.description ?? "",
            price: data.price ?? 0,
            imageBase64: data.imageBase64 ?? null,
            imageUrl: data.imageUrl ?? null,
            isActive: data.isActive ?? true,
            likeCount: data.likeCount ?? 0,
            likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
            createdAt: data.createdAt ?? null,
          };
        });

        setProducts(loadedProducts);
        setIsLoading(false);
        setErrorMessage("");
      },
      (error) => {
        console.error("Feil ved henting av produkter:", error);
        setErrorMessage("Kunne ikke hente produktene.");
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  function formatPrice(price: number) {
    return price.toLocaleString("nb-NO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }



  async function toggleLike(product: Product) {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      Alert.alert(
        "Logg inn",
        "Du må være logget inn for å like et produkt."
      );
      return;
    }

    if (updatingLikeId) {
      return;
    }

    try {
      setUpdatingLikeId(product.id);

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
      setUpdatingLikeId(null);
    }
  }

  function getProductImage(product: Product) {
    if (product.imageBase64) {
      return product.imageBase64;
    }

    if (product.imageUrl) {
      return product.imageUrl;
    }

    return null;
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1F7A3D" />
          <Text style={styles.loadingText}>Henter produkter...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.container,
          products.length === 0 && styles.emptyListContainer,
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.badge}>
              <Ionicons
                name="sparkles-outline"
                size={17}
                color="#2166A5"
              />

              <Text style={styles.badgeText}>Nytt i butikken</Text>
            </View>

            <Text style={styles.title}>Nye produkter</Text>

            <Text style={styles.subtitle}>
              Se de nyeste produktene som har kommet inn i butikken.
            </Text>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={21}
                  color="#A52626"
                />

                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="cube-outline"
              size={55}
              color="#8B968E"
            />

            <Text style={styles.emptyTitle}>Ingen produkter ennå</Text>

            <Text style={styles.emptyText}>
              Nye produkter vil vises her når de publiseres av butikken.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const productImage = getProductImage(item);

          return (
            <View style={styles.card}>
              <View style={styles.imageContainer}>
                {productImage ? (
                  <Image
                    source={{ uri: productImage }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons
                      name="cube-outline"
                      size={45}
                      color="#2166A5"
                    />

                    <Text style={styles.noImageText}>Produktbilde</Text>
                  </View>
                )}

                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NY</Text>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.likeButton,
                    pressed && styles.likeButtonPressed,
                  ]}
                  onPress={() => toggleLike(item)}
                  disabled={updatingLikeId === item.id}
                >
                  <Ionicons
                    name={
                      auth.currentUser &&
                      item.likedBy.includes(auth.currentUser.uid)
                        ? "heart"
                        : "heart-outline"
                    }
                    size={23}
                    color="#D62828"
                  />

                  <Text style={styles.likeCount}>{item.likeCount}</Text>
                </Pressable>
              </View>

              <View style={styles.cardContent}>
                <Text style={styles.productName}>{item.name}</Text>

                <Text style={styles.description}>
                  {item.description}
                </Text>

                <Text style={styles.price}>
                  {formatPrice(item.price)} kr
                </Text>
              </View>
            </View>
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
    backgroundColor: "#E5EFF8",
  },

  badgeText: {
    color: "#2166A5",
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

  imageContainer: {
    height: 190,
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#E5EFF8",
  },

  productImage: {
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
    color: "#52789A",
  },

  newBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#2166A5",
  },

  newBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
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

  productName: {
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

  price: {
    marginTop: 16,
    fontSize: 21,
    fontWeight: "900",
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