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

type Offer = {
  id: string;
  title: string;
  description: string;
  oldPrice: number;
  offerPrice: number;
  discountPercentage: number;
  duration: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAt?: Timestamp | null;
};

export default function ManageOffersScreen() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingOfferId, setUpdatingOfferId] = useState<string | null>(null);

  useEffect(() => {
    const offersQuery = query(
      collection(db, "offers"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      offersQuery,
      (snapshot) => {
        const loadedOffers: Offer[] = snapshot.docs.map((document) => {
          const data = document.data();

          return {
            id: document.id,
            title: data.title ?? "",
            description: data.description ?? "",
            oldPrice: data.oldPrice ?? 0,
            offerPrice: data.offerPrice ?? 0,
            discountPercentage: data.discountPercentage ?? 0,
            duration: data.duration ?? "",
            imageUrl: data.imageUrl ?? null,
            isActive: data.isActive ?? true,
            createdAt: data.createdAt ?? null,
          };
        });

        setOffers(loadedOffers);
        setIsLoading(false);
      },
      (error) => {
        console.error("Feil ved henting av tilbud:", error);

        setIsLoading(false);

        Alert.alert(
          "Kunne ikke hente tilbud",
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

  function openEditOffer(offerId: string) {
    router.push({
      pathname: "/admin/edit-offer",
      params: {
        id: offerId,
      },
    });
  }

  async function toggleOfferStatus(offer: Offer) {
    if (updatingOfferId !== null) {
      return;
    }

    try {
      setUpdatingOfferId(offer.id);

      const offerReference = doc(db, "offers", offer.id);

      await updateDoc(offerReference, {
        isActive: !offer.isActive,
      });
    } catch (error) {
      console.error("Feil ved oppdatering av tilbud:", error);

      Alert.alert(
        "Kunne ikke oppdatere",
        "Tilbudets status kunne ikke endres."
      );
    } finally {
      setUpdatingOfferId(null);
    }
  }

  function confirmDeleteOffer(offer: Offer) {
    Alert.alert(
      "Slett tilbud",
      `Er du sikker på at du vil slette «${offer.title}» permanent?`,
      [
        {
          text: "Avbryt",
          style: "cancel",
        },
        {
          text: "Slett",
          style: "destructive",
          onPress: async () => {
            await deleteOffer(offer);
          },
        },
      ]
    );
  }

  async function deleteOffer(offer: Offer) {
    if (updatingOfferId !== null) {
      return;
    }

    try {
      setUpdatingOfferId(offer.id);

      console.log("Forsøker å slette tilbud:", offer.id);

      const offerReference = doc(db, "offers", offer.id);

      await deleteDoc(offerReference);

      const deletedOfferSnapshot = await getDoc(offerReference);

      if (deletedOfferSnapshot.exists()) {
        throw new Error("Tilbudet eksisterer fortsatt etter deleteDoc.");
      }

      console.log("Tilbudet ble slettet:", offer.id);

      setOffers((currentOffers) =>
        currentOffers.filter(
          (currentOffer) => currentOffer.id !== offer.id
        )
      );

      Alert.alert(
        "Tilbud slettet",
        `«${offer.title}» ble slettet permanent.`
      );
    } catch (error) {
      console.error("Feil ved sletting av tilbud:", error);

      Alert.alert(
        "Kunne ikke slette",
        "Tilbudet ble ikke slettet. Se terminalen for den konkrete feilen."
      );
    } finally {
      setUpdatingOfferId(null);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1F7A3D" />

        <Text style={styles.loadingText}>Henter tilbud...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={offers}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.container,
          offers.length === 0 && styles.emptyListContainer,
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
                name="pricetag-outline"
                size={17}
                color="#8A5A00"
              />

              <Text style={styles.badgeText}>Admin</Text>
            </View>

            <Text style={styles.title}>Administrer tilbud</Text>

            <Text style={styles.subtitle}>
              Rediger, aktiver, skjul eller slett tilbud fra appen.
            </Text>

            <View style={styles.summaryBox}>
              <View>
                <Text style={styles.summaryNumber}>{offers.length}</Text>
                <Text style={styles.summaryLabel}>Totalt</Text>
              </View>

              <View style={styles.summaryDivider} />

              <View>
                <Text style={styles.summaryNumber}>
                  {offers.filter((offer) => offer.isActive).length}
                </Text>

                <Text style={styles.summaryLabel}>Aktive</Text>
              </View>

              <View style={styles.summaryDivider} />

              <View>
                <Text style={styles.summaryNumber}>
                  {offers.filter((offer) => !offer.isActive).length}
                </Text>

                <Text style={styles.summaryLabel}>Skjulte</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="pricetag-outline"
              size={58}
              color="#929A94"
            />

            <Text style={styles.emptyTitle}>Ingen tilbud</Text>

            <Text style={styles.emptyText}>
              Tilbud du publiserer vil vises her.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isUpdating = updatingOfferId === item.id;

          return (
            <View
              style={[
                styles.card,
                !item.isActive && styles.inactiveCard,
              ]}
            >
              <View style={styles.offerRow}>
                <View
                  style={[
                    styles.offerIcon,
                    item.isActive
                      ? styles.activeIcon
                      : styles.inactiveIcon,
                  ]}
                >
                  <Ionicons
                    name={
                      item.isActive
                        ? "pricetag"
                        : "eye-off-outline"
                    }
                    size={27}
                    color={item.isActive ? "#D62828" : "#777777"}
                  />
                </View>

                <View style={styles.offerInformation}>
                  <View style={styles.titleRow}>
                    <Text style={styles.offerTitle} numberOfLines={1}>
                      {item.title}
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

                  <View style={styles.priceRow}>
                    <Text style={styles.offerPrice}>
                      {formatPrice(item.offerPrice)} kr
                    </Text>

                    <Text style={styles.oldPrice}>
                      {formatPrice(item.oldPrice)} kr
                    </Text>

                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>
                        -{item.discountPercentage}%
                      </Text>
                    </View>
                  </View>

                  <View style={styles.durationRow}>
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color="#666666"
                    />

                    <Text style={styles.durationText}>
                      {item.duration}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.editActionContainer}>
                <Pressable
                  style={({ pressed }) => [
                    styles.editButton,
                    pressed && styles.buttonPressed,
                    isUpdating && styles.disabledButton,
                  ]}
                  onPress={() => openEditOffer(item.id)}
                  disabled={isUpdating}
                >
                  <Ionicons
                    name="create-outline"
                    size={19}
                    color="#8A5A00"
                  />

                  <Text style={styles.editButtonText}>
                    Rediger tilbud
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
                  onPress={() => toggleOfferStatus(item)}
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
                    {item.isActive ? "Skjul tilbud" : "Aktiver tilbud"}
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.deleteButton,
                    pressed && styles.buttonPressed,
                    isUpdating && styles.disabledButton,
                  ]}
                  onPress={() => confirmDeleteOffer(item)}
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
    backgroundColor: "#FFF1D6",
  },

  badgeText: {
    color: "#8A5A00",
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

  offerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  offerIcon: {
    width: 54,
    height: 54,
    marginRight: 13,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  activeIcon: {
    backgroundColor: "#FBE5E5",
  },

  inactiveIcon: {
    backgroundColor: "#E4E4E4",
  },

  offerInformation: {
    flex: 1,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  offerTitle: {
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

  priceRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },

  offerPrice: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1F7A3D",
  },

  oldPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#888888",
    textDecorationLine: "line-through",
  },

  discountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#D62828",
  },

  discountText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },

  durationRow: {
    marginTop: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  durationText: {
    flex: 1,
    fontSize: 12,
    color: "#666666",
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
    backgroundColor: "#FFF1D6",
    borderWidth: 1,
    borderColor: "#E0BE7B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  editButtonText: {
    color: "#8A5A00",
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