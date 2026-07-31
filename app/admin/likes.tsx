import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { db } from "../../firebase/firebaseConfig";

type LikeItem = {
  id: string;
  title: string;
  likeCount: number;
  type: "Tilbud" | "Produkt";
};

export default function LikesScreen() {
  const [offers, setOffers] = useState<LikeItem[]>([]);
  const [products, setProducts] = useState<LikeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let offersLoaded = false;
    let productsLoaded = false;

    const finishLoading = () => {
      if (offersLoaded && productsLoaded) {
        setIsLoading(false);
      }
    };

    const unsubscribeOffers = onSnapshot(collection(db, "offers"), (snapshot) => {
      setOffers(
        snapshot.docs.map((document) => {
          const data = document.data();

          return {
            id: document.id,
            title: data.title ?? "Tilbud uten navn",
            likeCount: Number(data.likeCount ?? 0),
            type: "Tilbud",
          };
        })
      );

      offersLoaded = true;
      finishLoading();
    });

    const unsubscribeProducts = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        setProducts(
          snapshot.docs.map((document) => {
            const data = document.data();

            return {
              id: document.id,
              title: data.name ?? "Produkt uten navn",
              likeCount: Number(data.likeCount ?? 0),
              type: "Produkt",
            };
          })
        );

        productsLoaded = true;
        finishLoading();
      }
    );

    return () => {
      unsubscribeOffers();
      unsubscribeProducts();
    };
  }, []);

  const sortedOffers = useMemo(
    () => [...offers].sort(
      (first, second) => second.likeCount - first.likeCount
    ),
    [offers]
  );

  const sortedProducts = useMemo(
    () => [...products].sort(
      (first, second) => second.likeCount - first.likeCount
    ),
    [products]
  );

  const totalOfferLikes = useMemo(
    () => sortedOffers.reduce((sum, item) => sum + item.likeCount, 0),
    [sortedOffers]
  );

  const totalProductLikes = useMemo(
    () => sortedProducts.reduce((sum, item) => sum + item.likeCount, 0),
    [sortedProducts]
  );

  const totalLikes = totalOfferLikes + totalProductLikes;

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#C62828" />
        <Text style={styles.loadingText}>Henter likes...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Pressable
        style={({ pressed }) => [
          styles.backButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back-outline" size={21} color="#202020" />
        <Text style={styles.backButtonText}>Tilbake til administrasjon</Text>
      </Pressable>

      <View style={styles.header}>
        <View style={styles.badge}>
          <Ionicons name="heart" size={17} color="#C62828" />
          <Text style={styles.badgeText}>Popularitet</Text>
        </View>

        <Text style={styles.title}>Likes</Text>

        <Text style={styles.subtitle}>
          Se hvor mange likes hvert tilbud og produkt har fått.
        </Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.offerSummaryCard]}>
          <View style={[styles.summaryIcon, styles.offerSummaryIcon]}>
            <Ionicons name="pricetag" size={24} color="#8A5A00" />
          </View>

          <Text style={styles.summaryNumber}>{totalOfferLikes}</Text>
          <Text style={styles.summaryLabel}>Likes på tilbud</Text>
        </View>

        <View style={[styles.summaryCard, styles.productSummaryCard]}>
          <View style={[styles.summaryIcon, styles.productSummaryIcon]}>
            <Ionicons name="cube" size={24} color="#2166A5" />
          </View>

          <Text style={styles.summaryNumber}>{totalProductLikes}</Text>
          <Text style={styles.summaryLabel}>Likes på produkter</Text>
        </View>
      </View>

      <View style={styles.totalLikesBox}>
        <Ionicons name="heart" size={20} color="#C62828" />
        <Text style={styles.totalLikesText}>
          {totalLikes} likes totalt
        </Text>
      </View>

      <View style={styles.offerSection}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, styles.offerSectionIcon]}>
            <Ionicons name="pricetag-outline" size={22} color="#8A5A00" />
          </View>

          <View>
            <Text style={styles.sectionTitle}>Tilbud</Text>
            <Text style={styles.sectionSubtitle}>
              Rangert etter flest likes
            </Text>
          </View>
        </View>

        {sortedOffers.length === 0 ? (
          <View style={styles.smallEmptyCard}>
            <Ionicons name="pricetag-outline" size={38} color="#A27A2A" />
            <Text style={styles.emptyTitle}>Ingen tilbud ennå</Text>
          </View>
        ) : (
          sortedOffers.map((item, index) => (
            <View
              style={[styles.itemCard, styles.offerItemCard]}
              key={`Tilbud-${item.id}`}
            >
              <View style={[styles.rankCircle, styles.offerRankCircle]}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>

              <View style={styles.itemInformation}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.title}
                </Text>

                <View style={styles.typeRow}>
                  <Ionicons
                    name="pricetag-outline"
                    size={14}
                    color="#8A5A00"
                  />
                  <Text style={[styles.itemType, styles.offerTypeText]}>
                    Tilbud
                  </Text>
                </View>
              </View>

              <View style={styles.likeBadge}>
                <Ionicons name="heart" size={17} color="#C62828" />
                <Text style={styles.likeCount}>{item.likeCount}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.productSection}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, styles.productSectionIcon]}>
            <Ionicons name="cube-outline" size={22} color="#2166A5" />
          </View>

          <View>
            <Text style={styles.sectionTitle}>Nye produkter</Text>
            <Text style={styles.sectionSubtitle}>
              Rangert etter flest likes
            </Text>
          </View>
        </View>

        {sortedProducts.length === 0 ? (
          <View style={styles.smallEmptyCard}>
            <Ionicons name="cube-outline" size={38} color="#2166A5" />
            <Text style={styles.emptyTitle}>Ingen produkter ennå</Text>
          </View>
        ) : (
          sortedProducts.map((item, index) => (
            <View
              style={[styles.itemCard, styles.productItemCard]}
              key={`Produkt-${item.id}`}
            >
              <View style={[styles.rankCircle, styles.productRankCircle]}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>

              <View style={styles.itemInformation}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.title}
                </Text>

                <View style={styles.typeRow}>
                  <Ionicons
                    name="cube-outline"
                    size={14}
                    color="#2166A5"
                  />
                  <Text style={[styles.itemType, styles.productTypeText]}>
                    Produkt
                  </Text>
                </View>
              </View>

              <View style={styles.likeBadge}>
                <Ionicons name="heart" size={17} color="#C62828" />
                <Text style={styles.likeCount}>{item.likeCount}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F7F5",
  },

  container: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 60,
  },

  backButton: {
    alignSelf: "flex-start",
    minHeight: 44,
    marginBottom: 22,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8DDD9",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  backButtonText: {
    color: "#202020",
    fontSize: 14,
    fontWeight: "800",
  },

  header: {
    marginBottom: 22,
  },

  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#FBE7E7",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  badgeText: {
    color: "#C62828",
    fontSize: 13,
    fontWeight: "800",
  },

  title: {
    marginTop: 16,
    fontSize: 30,
    fontWeight: "900",
    color: "#171717",
  },

  subtitle: {
    marginTop: 7,
    fontSize: 15,
    lineHeight: 22,
    color: "#666666",
  },

  summaryRow: {
    flexDirection: "row",
    gap: 12,
  },

  summaryCard: {
    flex: 1,
    minHeight: 145,
    padding: 16,
    borderRadius: 17,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
  },

  offerSummaryCard: {
    borderColor: "#ECD8AF",
  },

  productSummaryCard: {
    borderColor: "#C8DDF0",
  },

  summaryIcon: {
    width: 44,
    height: 44,
    marginBottom: 14,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  offerSummaryIcon: {
    backgroundColor: "#FFF1D6",
  },

  productSummaryIcon: {
    backgroundColor: "#E5EFF8",
  },

  summaryNumber: {
    fontSize: 27,
    fontWeight: "900",
    color: "#202020",
  },

  summaryLabel: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#666666",
  },

  totalLikesBox: {
    marginTop: 12,
    marginBottom: 28,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 13,
    backgroundColor: "#FBE7E7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  totalLikesText: {
    color: "#C62828",
    fontSize: 15,
    fontWeight: "900",
  },

  offerSection: {
    marginBottom: 30,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#ECD8AF",
    backgroundColor: "#FFFDF8",
  },

  productSection: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#C8DDF0",
    backgroundColor: "#F8FBFE",
  },

  sectionHeader: {
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  sectionIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  offerSectionIcon: {
    backgroundColor: "#FFF1D6",
  },

  productSectionIcon: {
    backgroundColor: "#E5EFF8",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#222222",
  },

  sectionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#777777",
  },

  itemCard: {
    minHeight: 76,
    marginBottom: 10,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
  },

  offerItemCard: {
    borderColor: "#EEDDBA",
  },

  productItemCard: {
    borderColor: "#D2E2F0",
  },

  rankCircle: {
    width: 38,
    height: 38,
    marginRight: 12,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  offerRankCircle: {
    backgroundColor: "#FFF1D6",
  },

  productRankCircle: {
    backgroundColor: "#E5EFF8",
  },

  rankText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#444444",
  },

  itemInformation: {
    flex: 1,
  },

  itemTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#202020",
  },

  typeRow: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  itemType: {
    fontSize: 12,
    fontWeight: "700",
  },

  offerTypeText: {
    color: "#8A5A00",
  },

  productTypeText: {
    color: "#2166A5",
  },

  likeBadge: {
    minWidth: 58,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FBE7E7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  likeCount: {
    color: "#C62828",
    fontSize: 15,
    fontWeight: "900",
  },

  smallEmptyCard: {
    minHeight: 140,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E5E2",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "900",
    color: "#303030",
  },

  centerContainer: {
    flex: 1,
    backgroundColor: "#F5F7F5",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666666",
  },

  buttonPressed: {
    opacity: 0.72,
  },
});