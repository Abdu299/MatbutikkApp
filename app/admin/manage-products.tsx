import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { db } from "../../firebase/firebaseConfig";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt?: Timestamp | null;
};

export default function ManageProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const productsQuery = query(
      collection(db, "products"),
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
            imageUrl: data.imageUrl ?? null,
            isActive: data.isActive ?? true,
            createdAt: data.createdAt ?? null,
          };
        });

        setProducts(loadedProducts);
        setIsLoading(false);
      },
      (error) => {
        console.error("Feil ved henting av produkter:", error);

        setIsLoading(false);

        Alert.alert(
          "Kunne ikke hente produkter",
          "Det oppstod en feil ved henting av data."
        );
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

  function openEditProduct(productId: string) {
    router.push({
      pathname: "/admin/edit-product",
      params: {
        id: productId,
      },
    });
  }

  async function toggleProductStatus(product: Product) {
    if (updatingProductId !== null) {
      return;
    }

    try {
      setUpdatingProductId(product.id);

      const productReference = doc(db, "products", product.id);

      await updateDoc(productReference, {
        isActive: !product.isActive,
      });
    } catch (error) {
      console.error("Feil ved oppdatering av produkt:", error);

      Alert.alert(
        "Kunne ikke oppdatere",
        "Produktets status kunne ikke endres."
      );
    } finally {
      setUpdatingProductId(null);
    }
  }

  function confirmDeleteProduct(product: Product) {
    Alert.alert(
      "Slett produkt",
      `Er du sikker på at du vil slette «${product.name}» permanent?`,
      [
        {
          text: "Avbryt",
          style: "cancel",
        },
        {
          text: "Slett",
          style: "destructive",
          onPress: async () => {
            await deleteProduct(product);
          },
        },
      ]
    );
  }

  async function deleteProduct(product: Product) {
    if (updatingProductId !== null) {
      return;
    }

    try {
      setUpdatingProductId(product.id);

      console.log("Forsøker å slette produkt:", product.id);

      const productReference = doc(db, "products", product.id);

      await deleteDoc(productReference);

      const deletedProductSnapshot = await getDoc(productReference);

      if (deletedProductSnapshot.exists()) {
        throw new Error("Produktet eksisterer fortsatt etter deleteDoc.");
      }

      console.log("Produktet ble slettet:", product.id);

      setProducts((currentProducts) =>
        currentProducts.filter(
          (currentProduct) => currentProduct.id !== product.id
        )
      );

      Alert.alert(
        "Produkt slettet",
        `«${product.name}» ble slettet permanent.`
      );
    } catch (error) {
      console.error("Feil ved sletting av produkt:", error);

      Alert.alert(
        "Kunne ikke slette",
        "Produktet ble ikke slettet. Se terminalen for den konkrete feilen."
      );
    } finally {
      setUpdatingProductId(null);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1F7A3D" />

        <Text style={styles.loadingText}>Henter produkter...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
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

            <View style={styles.badge}>
              <Ionicons
                name="settings-outline"
                size={17}
                color="#6A3FA0"
              />

              <Text style={styles.badgeText}>Admin</Text>
            </View>

            <Text style={styles.title}>Administrer produkter</Text>

            <Text style={styles.subtitle}>
              Rediger, aktiver, skjul eller slett produkter fra appen.
            </Text>

            <View style={styles.summaryBox}>
              <View>
                <Text style={styles.summaryNumber}>{products.length}</Text>
                <Text style={styles.summaryLabel}>Totalt</Text>
              </View>

              <View style={styles.summaryDivider} />

              <View>
                <Text style={styles.summaryNumber}>
                  {products.filter((product) => product.isActive).length}
                </Text>

                <Text style={styles.summaryLabel}>Aktive</Text>
              </View>

              <View style={styles.summaryDivider} />

              <View>
                <Text style={styles.summaryNumber}>
                  {products.filter((product) => !product.isActive).length}
                </Text>

                <Text style={styles.summaryLabel}>Skjulte</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={58} color="#929A94" />

            <Text style={styles.emptyTitle}>Ingen produkter</Text>

            <Text style={styles.emptyText}>
              Produkter du publiserer vil vises her.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isUpdating = updatingProductId === item.id;

          return (
            <View
              style={[
                styles.card,
                !item.isActive && styles.inactiveCard,
              ]}
            >
              <View style={styles.productRow}>
                <View
                  style={[
                    styles.productIcon,
                    item.isActive
                      ? styles.activeIcon
                      : styles.inactiveIcon,
                  ]}
                >
                  <Ionicons
                    name={item.isActive ? "cube" : "eye-off-outline"}
                    size={27}
                    color={item.isActive ? "#2166A5" : "#777777"}
                  />
                </View>

                <View style={styles.productInformation}>
                  <View style={styles.nameRow}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {item.name}
                    </Text>

                    <View
                      style={[
                        styles.statusBadge,
                        item.isActive
                          ? styles.activeStatusBadge
                          : styles.inactiveStatusBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          item.isActive
                            ? styles.activeStatusText
                            : styles.inactiveStatusText,
                        ]}
                      >
                        {item.isActive ? "Aktiv" : "Skjult"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.description} numberOfLines={2}>
                    {item.description}
                  </Text>

                  <Text style={styles.price}>
                    {formatPrice(item.price)} kr
                  </Text>
                </View>
              </View>

              <View style={styles.editActionContainer}>
                <Pressable
                  style={({ pressed }) => [
                    styles.editButton,
                    pressed && styles.buttonPressed,
                    isUpdating && styles.disabledButton,
                  ]}
                  onPress={() => openEditProduct(item.id)}
                  disabled={isUpdating}
                >
                  <Ionicons
                    name="create-outline"
                    size={19}
                    color="#2166A5"
                  />

                  <Text style={styles.editButtonText}>
                    Rediger produkt
                  </Text>
                </Pressable>
              </View>

              <View style={styles.actions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.statusButton,
                    item.isActive
                      ? styles.deactivateButton
                      : styles.activateButton,
                    pressed && styles.buttonPressed,
                    isUpdating && styles.disabledButton,
                  ]}
                  onPress={() => toggleProductStatus(item)}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator
                      size="small"
                      color={item.isActive ? "#8A5A00" : "#1F7A3D"}
                    />
                  ) : (
                    <Ionicons
                      name={
                        item.isActive
                          ? "eye-off-outline"
                          : "eye-outline"
                      }
                      size={19}
                      color={item.isActive ? "#8A5A00" : "#1F7A3D"}
                    />
                  )}

                  <Text
                    style={[
                      styles.statusButtonText,
                      item.isActive
                        ? styles.deactivateButtonText
                        : styles.activateButtonText,
                    ]}
                  >
                    {item.isActive ? "Skjul produkt" : "Aktiver produkt"}
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.deleteButton,
                    pressed && styles.buttonPressed,
                    isUpdating && styles.disabledButton,
                  ]}
                  onPress={() => confirmDeleteProduct(item)}
                  disabled={isUpdating}
                >
                  <Ionicons
                    name="trash-outline"
                    size={19}
                    color="#B3261E"
                  />

                  <Text style={styles.deleteButtonText}>Slett</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </View>
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

  emptyListContainer: {
    flexGrow: 1,
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
    backgroundColor: "#F0E8FA",
  },

  badgeText: {
    color: "#6A3FA0",
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

  summaryBox: {
    marginTop: 20,
    paddingVertical: 17,
    paddingHorizontal: 20,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E5E2",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },

  summaryNumber: {
    fontSize: 21,
    fontWeight: "900",
    color: "#202020",
    textAlign: "center",
  },

  summaryLabel: {
    marginTop: 3,
    fontSize: 12,
    color: "#707070",
    textAlign: "center",
  },

  summaryDivider: {
    width: 1,
    height: 38,
    backgroundColor: "#E4E4E4",
  },

  card: {
    marginBottom: 15,
    padding: 16,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E5E2",
  },

  inactiveCard: {
    opacity: 0.72,
    backgroundColor: "#F1F1F1",
  },

  productRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  productIcon: {
    width: 54,
    height: 54,
    marginRight: 13,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  activeIcon: {
    backgroundColor: "#E5EFF8",
  },

  inactiveIcon: {
    backgroundColor: "#E4E4E4",
  },

  productInformation: {
    flex: 1,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  productName: {
    flex: 1,
    fontSize: 17,
    fontWeight: "900",
    color: "#202020",
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },

  activeStatusBadge: {
    backgroundColor: "#E2F0E5",
  },

  inactiveStatusBadge: {
    backgroundColor: "#E4E4E4",
  },

  statusText: {
    fontSize: 11,
    fontWeight: "900",
  },

  activeStatusText: {
    color: "#1F7A3D",
  },

  inactiveStatusText: {
    color: "#666666",
  },

  description: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: "#6E6E6E",
  },

  price: {
    marginTop: 9,
    fontSize: 17,
    fontWeight: "900",
    color: "#1F7A3D",
  },

  editActionContainer: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#ECECEC",
  },

  editButton: {
    minHeight: 46,
    borderRadius: 11,
    backgroundColor: "#E5EFF8",
    borderWidth: 1,
    borderColor: "#B8CEE0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  editButtonText: {
    color: "#2166A5",
    fontSize: 13,
    fontWeight: "800",
  },

  actions: {
    marginTop: 9,
    flexDirection: "row",
    gap: 9,
  },

  statusButton: {
    minHeight: 46,
    flex: 1,
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  activateButton: {
    backgroundColor: "#E3EDE5",
    borderColor: "#8CB397",
  },

  deactivateButton: {
    backgroundColor: "#FFF1D6",
    borderColor: "#E0BE7B",
  },

  statusButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },

  activateButtonText: {
    color: "#1F7A3D",
  },

  deactivateButtonText: {
    color: "#8A5A00",
  },

  deleteButton: {
    minHeight: 46,
    paddingHorizontal: 16,
    borderRadius: 11,
    backgroundColor: "#FBE5E5",
    borderWidth: 1,
    borderColor: "#EAB8B8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  deleteButtonText: {
    color: "#B3261E",
    fontSize: 13,
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
    opacity: 0.7,
  },

  disabledButton: {
    opacity: 0.5,
  },

  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F7F5",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666666",
  },

  emptyContainer: {
    flex: 1,
    minHeight: 350,
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
    textAlign: "center",
    color: "#737373",
  },
});