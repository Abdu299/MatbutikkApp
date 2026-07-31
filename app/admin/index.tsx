import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
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

export default function AdminScreen() {
  const [offerLikes, setOfferLikes] = useState<LikeItem[]>([]);
  const [productLikes, setProductLikes] = useState<LikeItem[]>([]);

  useEffect(() => {
    const unsubscribeOffers = onSnapshot(
      collection(db, "offers"),
      (snapshot) => {
        setOfferLikes(
          snapshot.docs.map((document) => {
            const data = document.data();

            return {
              id: document.id,
              title: data.title ?? "Uten navn",
              likeCount: data.likeCount ?? 0,
              type: "Tilbud",
            };
          })
        );
      }
    );

    const unsubscribeProducts = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        setProductLikes(
          snapshot.docs.map((document) => {
            const data = document.data();

            return {
              id: document.id,
              title: data.name ?? "Uten navn",
              likeCount: data.likeCount ?? 0,
              type: "Produkt",
            };
          })
        );
      }
    );

    return () => {
      unsubscribeOffers();
      unsubscribeProducts();
    };
  }, []);

  const popularityItems = useMemo(
    () =>
      [...offerLikes, ...productLikes]
        .sort((first, second) => second.likeCount - first.likeCount)
        .slice(0, 10),
    [offerLikes, productLikes]
  );

  const totalLikes = useMemo(
    () =>
      [...offerLikes, ...productLikes].reduce(
        (sum, item) => sum + item.likeCount,
        0
      ),
    [offerLikes, productLikes]
  );

  async function testFirebase() {
    try {
      await addDoc(collection(db, "firebaseTests"), {
        message: "Firebase fungerer",
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        "Firebase fungerer",
        "Testdata ble lagret ."
      );
    } catch (error) {
      console.error("Firebase-feil:", error);

      Alert.alert(
        "Firebase-feil",
        "Kunne ikke lagre testdata. Se terminalen for feilmeldingen."
      );
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Pressable
        style={({ pressed }) => [
          styles.profileBackButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={() => router.back()}
      >
        <Ionicons
          name="arrow-back-outline"
          size={21}
          color="#202020"
        />

        <Text style={styles.profileBackButtonText}>
          Tilbake til profil
        </Text>
      </Pressable>

      <View style={styles.header}>
        <View style={styles.adminBadge}>
          <Ionicons
            name="shield-checkmark-outline"
            size={18}
            color="#1F7A3D"
          />

          <Text style={styles.adminBadgeText}>Adminpanel</Text>
        </View>

        <Text style={styles.title}>Administrasjon</Text>

        <Text style={styles.subtitle}>
          Administrer tilbud og nye produkter i appen.
        </Text>
      </View>

      

      <Text style={styles.sectionTitle}>Opprett innhold</Text>

      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
        onPress={() => router.push("/admin/add-offer")}
      >
        <View style={[styles.iconBox, styles.offerIconBox]}>
          <Ionicons
            name="pricetag-outline"
            size={28}
            color="#1F7A3D"
          />
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Legg til tilbud</Text>

          <Text style={styles.cardDescription}>
            Opprett et nytt tilbud med bilde, pris og varighet.
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={23}
          color="#777777"
        />
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
        onPress={() => router.push("/admin/add-product")}
      >
        <View style={[styles.iconBox, styles.productIconBox]}>
          <Ionicons
            name="cube-outline"
            size={28}
            color="#2166A5"
          />
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Legg til produkt</Text>

          <Text style={styles.cardDescription}>
            Publiser et nytt produkt på produktsiden.
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={23}
          color="#777777"
        />
      </Pressable>

      <Text style={styles.sectionTitle}>Administrer innhold</Text>

      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
        onPress={() => router.push("/admin/manage-offers")}
      >
        <View style={[styles.iconBox, styles.manageOfferIconBox]}>
          <Ionicons
            name="list-outline"
            size={28}
            color="#8A5A00"
          />
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Administrer tilbud</Text>

          <Text style={styles.cardDescription}>
            Se, skjul, aktiver og slett publiserte tilbud.
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={23}
          color="#777777"
        />
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
        onPress={() => router.push("/admin/manage-products")}
      >
        <View style={[styles.iconBox, styles.manageProductIconBox]}>
          <Ionicons
            name="settings-outline"
            size={28}
            color="#6A3FA0"
          />
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Administrer produkter</Text>

          <Text style={styles.cardDescription}>
            Se, skjul, aktiver og slett publiserte produkter.
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={23}
          color="#777777"
        />
      </Pressable>

      <Text style={styles.sectionTitle}>Statistikk</Text>

      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
        onPress={() => router.push("/admin/likes")}
      >
        <View style={[styles.iconBox, styles.likesIconBox]}>
          <Ionicons
            name="heart-outline"
            size={28}
            color="#C62828"
          />
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Likes</Text>

          <Text style={styles.cardDescription}>
            Se hvilke tilbud og produkter som har fått flest likes.
          </Text>
        </View>

        <View style={styles.likesCountBadge}>
          <Ionicons name="heart" size={15} color="#C62828" />
          <Text style={styles.likesCountText}>{totalLikes}</Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={23}
          color="#777777"
        />
      </Pressable>

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
    paddingTop: 28,
    paddingBottom: 60,
  },

  profileBackButton: {
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

  profileBackButtonText: {
    color: "#202020",
    fontSize: 14,
    fontWeight: "800",
  },

  header: {
    marginBottom: 22,
  },

  adminBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#E3EDE5",
  },

  adminBadgeText: {
    color: "#1F7A3D",
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

  testButton: {
    minHeight: 54,
    marginBottom: 28,
    borderRadius: 13,
    backgroundColor: "#222222",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  testButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },



  likesOverview: {
    marginBottom: 28,
    padding: 17,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E5E2",
  },

  likesOverviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  likesOverviewIcon: {
    width: 48,
    height: 48,
    marginRight: 12,
    borderRadius: 14,
    backgroundColor: "#FDE8E8",
    alignItems: "center",
    justifyContent: "center",
  },

  likesOverviewText: {
    flex: 1,
  },

  likesOverviewTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#202020",
  },

  likesOverviewSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: "#707070",
  },

  noLikesText: {
    paddingVertical: 14,
    textAlign: "center",
    color: "#777777",
    fontSize: 14,
  },

  likeRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#EFEFEF",
  },

  rankCircle: {
    width: 30,
    height: 30,
    marginRight: 10,
    borderRadius: 15,
    backgroundColor: "#F3F4F3",
    alignItems: "center",
    justifyContent: "center",
  },

  rankText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#555555",
  },

  likeItemContent: {
    flex: 1,
    paddingRight: 10,
  },

  likeItemTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#242424",
  },

  likeItemType: {
    marginTop: 2,
    fontSize: 12,
    color: "#7A7A7A",
  },

  likeCountBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#FDECEC",
  },

  likeCountText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#D62828",
  },

  sectionTitle: {
    marginBottom: 12,
    fontSize: 17,
    fontWeight: "900",
    color: "#222222",
  },

  card: {
    minHeight: 108,
    marginBottom: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E5E2",
  },

  cardPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },

  iconBox: {
    width: 54,
    height: 54,
    marginRight: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  offerIconBox: {
    backgroundColor: "#E3EDE5",
  },

  productIconBox: {
    backgroundColor: "#E5EFF8",
  },

  manageOfferIconBox: {
    backgroundColor: "#FFF1D6",
  },

  manageProductIconBox: {
    backgroundColor: "#F0E8FA",
  },

  cardContent: {
    flex: 1,
    paddingRight: 10,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#202020",
  },

  cardDescription: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: "#707070",
  },


  likesIconBox: {
    backgroundColor: "#FBE7E7",
  },

  likesCountBadge: {
    marginRight: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FBE7E7",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  likesCountText: {
    color: "#C62828",
    fontSize: 14,
    fontWeight: "900",
  },

  buttonPressed: {
    opacity: 0.75,
  },
});