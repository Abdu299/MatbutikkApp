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

const ACTIVE_USER_DAYS = 30;

type AnalyticsItem = {
  id: string;
  title: string;
  openCount: number;
  likeCount: number;
  isActive: boolean;
};

type AnalyticsUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  lastActiveAt: unknown;
};

type RankingItem = {
  id: string;
  title: string;
  value: number;
};

type RankingSectionProps = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBackgroundColor: string;
  barColor: string;
  valueLabel: string;
  emptyText: string;
  items: RankingItem[];
};

function getDateFromFirestoreValue(value: unknown) {
  if (value instanceof Date) {
    return value;
  }

  if (value && typeof value === "object") {
    const possibleTimestamp = value as {
      toDate?: () => Date;
    };

    if (typeof possibleTimestamp.toDate === "function") {
      return possibleTimestamp.toDate();
    }
  }

  return null;
}

function formatLastActive(value: unknown) {
  const date = getDateFromFirestoreValue(value);

  if (!date) {
    return "Ingen aktivitet registrert";
  }

  return date.toLocaleString("nb-NO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getUserInitial(name: string, email: string) {
  const source = name.trim() || email.trim();

  if (!source) {
    return "?";
  }

  return source.charAt(0).toUpperCase();
}

function RankingSection({
  title,
  subtitle,
  icon,
  iconColor,
  iconBackgroundColor,
  barColor,
  valueLabel,
  emptyText,
  items,
}: RankingSectionProps) {
  const highestValue = Math.max(
    ...items.map((item) => item.value),
    1
  );

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View
          style={[
            styles.sectionIcon,
            { backgroundColor: iconBackgroundColor },
          ]}
        >
          <Ionicons
            name={icon}
            size={22}
            color={iconColor}
          />
        </View>

        <View style={styles.sectionHeaderContent}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>
            {subtitle}
          </Text>
        </View>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptySection}>
          <Ionicons
            name="bar-chart-outline"
            size={35}
            color="#9A9A9A"
          />

          <Text style={styles.emptySectionText}>
            {emptyText}
          </Text>
        </View>
      ) : (
        <View style={styles.rankingList}>
          {items.map((item, index) => {
            const percentage =
              item.value === 0
                ? 0
                : Math.max(
                    (item.value / highestValue) * 100,
                    5
                  );

            return (
              <View
                key={item.id}
                style={[
                  styles.rankingItem,
                  index > 0 && styles.rankingItemBorder,
                ]}
              >
                <View style={styles.rankingTopRow}>
                  <View style={styles.rankCircle}>
                    <Text style={styles.rankText}>
                      {index + 1}
                    </Text>
                  </View>

                  <Text
                    style={styles.rankingTitle}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>

                  <View style={styles.rankingValueBox}>
                    <Text style={styles.rankingValue}>
                      {item.value}
                    </Text>

                    <Text style={styles.rankingValueLabel}>
                      {valueLabel}
                    </Text>
                  </View>
                </View>

                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width:
                          `${percentage}%` as `${number}%`,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function AnalyticsScreen() {
  const [offers, setOffers] = useState<AnalyticsItem[]>([]);
  const [products, setProducts] = useState<
    AnalyticsItem[]
  >([]);
  const [users, setUsers] = useState<AnalyticsUser[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let offersLoaded = false;
    let productsLoaded = false;
    let usersLoaded = false;

    function finishLoading() {
      if (offersLoaded && productsLoaded && usersLoaded) {
        setIsLoading(false);
      }
    }

    const unsubscribeOffers = onSnapshot(
      collection(db, "offers"),
      (snapshot) => {
        setOffers(
          snapshot.docs.map((document) => {
            const data = document.data();

            const openedBy = Array.isArray(data.openedBy)
              ? data.openedBy.filter(
                  (userId): userId is string =>
                    typeof userId === "string"
                )
              : [];

            return {
              id: document.id,
              title: data.title ?? "Tilbud uten navn",
              openCount: new Set(openedBy).size,
              likeCount: Number(data.likeCount ?? 0),
              isActive: data.isActive ?? true,
            };
          })
        );

        offersLoaded = true;
        finishLoading();
      },
      (error) => {
        console.error(
          "Feil ved henting av tilbudsanalyse:",
          error
        );

        setErrorMessage(
          "Noe av analytics-dataen kunne ikke hentes."
        );

        offersLoaded = true;
        finishLoading();
      }
    );

    const unsubscribeProducts = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        setProducts(
          snapshot.docs.map((document) => {
            const data = document.data();

            const openedBy = Array.isArray(data.openedBy)
              ? data.openedBy.filter(
                  (userId): userId is string =>
                    typeof userId === "string"
                )
              : [];

            return {
              id: document.id,
              title: data.name ?? "Produkt uten navn",
              openCount: new Set(openedBy).size,
              likeCount: Number(data.likeCount ?? 0),
              isActive: data.isActive ?? true,
            };
          })
        );

        productsLoaded = true;
        finishLoading();
      },
      (error) => {
        console.error(
          "Feil ved henting av produktanalyse:",
          error
        );

        setErrorMessage(
          "Noe av analytics-dataen kunne ikke hentes."
        );

        productsLoaded = true;
        finishLoading();
      }
    );

    const unsubscribeUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        setUsers(
          snapshot.docs.map((document) => {
            const data = document.data();

            return {
              id: document.id,
              name: data.name ?? "",
              email: data.email ?? "",
              role: data.role ?? "user",
              lastActiveAt: data.lastActiveAt ?? null,
            };
          })
        );

        usersLoaded = true;
        finishLoading();
      },
      (error) => {
        console.error(
          "Feil ved henting av brukeraktivitet:",
          error
        );

        setErrorMessage(
          "Noe av analytics-dataen kunne ikke hentes."
        );

        usersLoaded = true;
        finishLoading();
      }
    );

    return () => {
      unsubscribeOffers();
      unsubscribeProducts();
      unsubscribeUsers();
    };
  }, []);

  const mostOpenedOffers = useMemo(
    () =>
      [...offers]
        .filter((item) => item.openCount > 0)
        .sort(
          (first, second) =>
            second.openCount - first.openCount
        )
        .slice(0, 5)
        .map((item) => ({
          id: item.id,
          title: item.title,
          value: item.openCount,
        })),
    [offers]
  );

  const mostOpenedProducts = useMemo(
    () =>
      [...products]
        .filter((item) => item.openCount > 0)
        .sort(
          (first, second) =>
            second.openCount - first.openCount
        )
        .slice(0, 5)
        .map((item) => ({
          id: item.id,
          title: item.title,
          value: item.openCount,
        })),
    [products]
  );

  const mostLikedProducts = useMemo(
    () =>
      [...products]
        .filter((item) => item.likeCount > 0)
        .sort(
          (first, second) =>
            second.likeCount - first.likeCount
        )
        .slice(0, 5)
        .map((item) => ({
          id: item.id,
          title: item.title,
          value: item.likeCount,
        })),
    [products]
  );

  const customerUsers = useMemo(
    () => users.filter((user) => user.role !== "admin"),
    [users]
  );

  const activeUsers = useMemo(() => {
    const activeThreshold =
      Date.now() -
      ACTIVE_USER_DAYS * 24 * 60 * 60 * 1000;

    return customerUsers
      .filter((user) => {
        const lastActiveDate =
          getDateFromFirestoreValue(user.lastActiveAt);

        return (
          lastActiveDate !== null &&
          lastActiveDate.getTime() >= activeThreshold
        );
      })
      .sort((first, second) => {
        const firstDate = getDateFromFirestoreValue(
          first.lastActiveAt
        );

        const secondDate = getDateFromFirestoreValue(
          second.lastActiveAt
        );

        return (
          (secondDate?.getTime() ?? 0) -
          (firstDate?.getTime() ?? 0)
        );
      });
  }, [customerUsers]);

  const totalOfferOpens = useMemo(
    () =>
      offers.reduce(
        (sum, item) => sum + item.openCount,
        0
      ),
    [offers]
  );

  const totalProductOpens = useMemo(
    () =>
      products.reduce(
        (sum, item) => sum + item.openCount,
        0
      ),
    [products]
  );

  const totalProductLikes = useMemo(
    () =>
      products.reduce(
        (sum, item) => sum + item.likeCount,
        0
      ),
    [products]
  );

  const activeContentCount = useMemo(
    () =>
      offers.filter((item) => item.isActive).length +
      products.filter((item) => item.isActive).length,
    [offers, products]
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator
          size="large"
          color="#0B6E75"
        />

        <Text style={styles.loadingText}>
          Henter analytics...
        </Text>
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
        <Ionicons
          name="arrow-back-outline"
          size={21}
          color="#202020"
        />

        <Text style={styles.backButtonText}>
          Tilbake til administrasjon
        </Text>
      </Pressable>

      <View style={styles.header}>
        <View style={styles.badge}>
          <Ionicons
            name="analytics-outline"
            size={18}
            color="#0B6E75"
          />

          <Text style={styles.badgeText}>
            Analytics dashboard
          </Text>
        </View>

        <Text style={styles.title}>
          Oversikt og aktivitet
        </Text>

        <Text style={styles.subtitle}>
          Se hvilket innhold som har flest unike åpninger,
          hvilke produkter som får flest likes, og hvor mange
          registrerte brukere som nylig har brukt appen.
        </Text>
      </View>

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Ionicons
            name="alert-circle-outline"
            size={22}
            color="#A52626"
          />

          <Text style={styles.errorText}>
            {errorMessage}
          </Text>
        </View>
      ) : null}

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <View
            style={[
              styles.summaryIcon,
              styles.opensSummaryIcon,
            ]}
          >
            <Ionicons
              name="eye-outline"
              size={24}
              color="#0B6E75"
            />
          </View>

          <Text style={styles.summaryNumber}>
            {totalOfferOpens + totalProductOpens}
          </Text>

          <Text style={styles.summaryLabel}>
            Unike åpninger
          </Text>

          <Text style={styles.summaryHelpText}>
            Én per bruker per innhold
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View
            style={[
              styles.summaryIcon,
              styles.usersSummaryIcon,
            ]}
          >
            <Ionicons
              name="people-outline"
              size={24}
              color="#1F7A3D"
            />
          </View>

          <Text style={styles.summaryNumber}>
            {activeUsers.length}
          </Text>

          <Text style={styles.summaryLabel}>
            Aktive brukere
          </Text>

          <Text style={styles.summaryHelpText}>
            Siste {ACTIVE_USER_DAYS} dager
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View
            style={[
              styles.summaryIcon,
              styles.likesSummaryIcon,
            ]}
          >
            <Ionicons
              name="heart-outline"
              size={24}
              color="#C62828"
            />
          </View>

          <Text style={styles.summaryNumber}>
            {totalProductLikes}
          </Text>

          <Text style={styles.summaryLabel}>
            Produkt-likes
          </Text>

          <Text style={styles.summaryHelpText}>
            Alle produkter
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View
            style={[
              styles.summaryIcon,
              styles.contentSummaryIcon,
            ]}
          >
            <Ionicons
              name="layers-outline"
              size={24}
              color="#6A3FA0"
            />
          </View>

          <Text style={styles.summaryNumber}>
            {activeContentCount}
          </Text>

          <Text style={styles.summaryLabel}>
            Aktivt innhold
          </Text>

          <Text style={styles.summaryHelpText}>
            Synlig i appen
          </Text>
        </View>
      </View>

      <RankingSection
        title="Mest åpnete tilbud"
        subtitle="Tilbudene som er åpnet av flest unike brukere."
        icon="pricetag-outline"
        iconColor="#1F7A3D"
        iconBackgroundColor="#E3EDE5"
        barColor="#1F7A3D"
        valueLabel="brukere"
        emptyText="Ingen tilbud har blitt åpnet ennå."
        items={mostOpenedOffers}
      />

      <RankingSection
        title="Mest åpnete produkter"
        subtitle="Produktene som er åpnet av flest unike brukere."
        icon="cube-outline"
        iconColor="#2166A5"
        iconBackgroundColor="#E5EFF8"
        barColor="#2166A5"
        valueLabel="brukere"
        emptyText="Ingen produkter har blitt åpnet ennå."
        items={mostOpenedProducts}
      />

      <RankingSection
        title="Mest likte produkter"
        subtitle="Produktene med flest registrerte likes."
        icon="heart-outline"
        iconColor="#C62828"
        iconBackgroundColor="#FBE7E7"
        barColor="#C62828"
        valueLabel="likes"
        emptyText="Ingen produkter har fått likes ennå."
        items={mostLikedProducts}
      />

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View
            style={[
              styles.sectionIcon,
              { backgroundColor: "#E3EDE5" },
            ]}
          >
            <Ionicons
              name="people-outline"
              size={22}
              color="#1F7A3D"
            />
          </View>

          <View style={styles.sectionHeaderContent}>
            <Text style={styles.sectionTitle}>
              Nylig aktive brukere
            </Text>

            <Text style={styles.sectionSubtitle}>
              Registrerte brukere som har brukt appen de siste{" "}
              {ACTIVE_USER_DAYS} dagene.
            </Text>
          </View>
        </View>

        <View style={styles.userSummaryRow}>
          <View style={styles.userSummaryItem}>
            <Text style={styles.userSummaryNumber}>
              {activeUsers.length}
            </Text>

            <Text style={styles.userSummaryLabel}>
              Aktive
            </Text>
          </View>

          <View style={styles.userSummaryDivider} />

          <View style={styles.userSummaryItem}>
            <Text style={styles.userSummaryNumber}>
              {customerUsers.length}
            </Text>

            <Text style={styles.userSummaryLabel}>
              Registrerte
            </Text>
          </View>
        </View>

        {activeUsers.length === 0 ? (
          <View style={styles.emptySection}>
            <Ionicons
              name="person-outline"
              size={35}
              color="#9A9A9A"
            />

            <Text style={styles.emptySectionText}>
              Ingen aktive brukere er registrert ennå.
            </Text>
          </View>
        ) : (
          <View style={styles.usersList}>
            {activeUsers
              .slice(0, 10)
              .map((user, index) => (
                <View
                  key={user.id}
                  style={[
                    styles.userRow,
                    index > 0 &&
                      styles.userRowBorder,
                  ]}
                >
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {getUserInitial(
                        user.name,
                        user.email
                      )}
                    </Text>
                  </View>

                  <View style={styles.userContent}>
                    <Text
                      style={styles.userName}
                      numberOfLines={1}
                    >
                      {user.name.trim() ||
                        "Bruker uten navn"}
                    </Text>

                    <Text
                      style={styles.userEmail}
                      numberOfLines={1}
                    >
                      {user.email ||
                        "Ingen e-post registrert"}
                    </Text>
                  </View>

                  <View style={styles.userActivityBox}>
                    <Ionicons
                      name="time-outline"
                      size={15}
                      color="#1F7A3D"
                    />

                    <Text style={styles.userActivityText}>
                      {formatLastActive(
                        user.lastActiveAt
                      )}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        )}
      </View>

      <View style={styles.infoBox}>
        <Ionicons
          name="information-circle-outline"
          size={22}
          color="#0B6E75"
        />

        <Text style={styles.infoText}>
          Hver innlogget bruker teller bare én gang per tilbud
          eller produkt, selv om detaljsiden åpnes flere ganger.
          Åpner samme bruker flere forskjellige tilbud eller
          produkter, teller det som én unik åpning på hvert
          innhold. Eldre åpningstall uten bruker-ID vises ikke i
          den nye statistikken. Aktive brukere er innloggede
          brukere som har brukt appen de siste
          {ACTIVE_USER_DAYS} dagene.
        </Text>
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
    paddingTop: 28,
    paddingBottom: 60,
  },

  backButton: {
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
    backgroundColor: "#DDF1F2",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  badgeText: {
    color: "#0B6E75",
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
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: "#666666",
  },

  errorBox: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 13,
    backgroundColor: "#FBE5E5",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: "#A52626",
  },

  summaryGrid: {
    marginBottom: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  summaryCard: {
    width: "48%",
    minHeight: 168,
    marginBottom: 14,
    padding: 16,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E5E2",
  },

  summaryIcon: {
    width: 46,
    height: 46,
    marginBottom: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  opensSummaryIcon: {
    backgroundColor: "#DDF1F2",
  },

  usersSummaryIcon: {
    backgroundColor: "#E3EDE5",
  },

  likesSummaryIcon: {
    backgroundColor: "#FBE7E7",
  },

  contentSummaryIcon: {
    backgroundColor: "#F0E8FA",
  },

  summaryNumber: {
    fontSize: 29,
    fontWeight: "900",
    color: "#202020",
  },

  summaryLabel: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "900",
    color: "#353535",
  },

  summaryHelpText: {
    marginTop: 3,
    fontSize: 12,
    color: "#777777",
  },

  sectionCard: {
    marginTop: 16,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E5E2",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  sectionIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionHeaderContent: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#202020",
  },

  sectionSubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    color: "#747474",
  },

  rankingList: {
    marginTop: 17,
  },

  rankingItem: {
    paddingVertical: 14,
  },

  rankingItemBorder: {
    borderTopWidth: 1,
    borderTopColor: "#EFEFEF",
  },

  rankingTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  rankCircle: {
    width: 31,
    height: 31,
    marginRight: 10,
    borderRadius: 16,
    backgroundColor: "#F1F3F1",
    alignItems: "center",
    justifyContent: "center",
  },

  rankText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#555555",
  },

  rankingTitle: {
    flex: 1,
    paddingRight: 10,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
    color: "#292929",
  },

  rankingValueBox: {
    alignItems: "flex-end",
  },

  rankingValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#222222",
  },

  rankingValueLabel: {
    marginTop: 1,
    fontSize: 10,
    color: "#777777",
  },

  progressTrack: {
    height: 7,
    marginTop: 11,
    marginLeft: 41,
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#ECEFEC",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
  },

  emptySection: {
    minHeight: 135,
    marginTop: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  emptySectionText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    color: "#777777",
  },

  userSummaryRow: {
    marginTop: 17,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: "#F5F7F5",
    flexDirection: "row",
    alignItems: "center",
  },

  userSummaryItem: {
    flex: 1,
    alignItems: "center",
  },

  userSummaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#DDE1DD",
  },

  userSummaryNumber: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1F7A3D",
  },

  userSummaryLabel: {
    marginTop: 2,
    fontSize: 12,
    color: "#707070",
  },

  usersList: {
    marginTop: 15,
  },

  userRow: {
    minHeight: 76,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  userRowBorder: {
    borderTopWidth: 1,
    borderTopColor: "#EFEFEF",
  },

  userAvatar: {
    width: 43,
    height: 43,
    marginRight: 11,
    borderRadius: 22,
    backgroundColor: "#E3EDE5",
    alignItems: "center",
    justifyContent: "center",
  },

  userAvatarText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#1F7A3D",
  },

  userContent: {
    flex: 1,
    paddingRight: 8,
  },

  userName: {
    fontSize: 14,
    fontWeight: "900",
    color: "#282828",
  },

  userEmail: {
    marginTop: 3,
    fontSize: 11,
    color: "#777777",
  },

  userActivityBox: {
    maxWidth: 106,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#EAF4EC",
    alignItems: "center",
    gap: 3,
  },

  userActivityText: {
    fontSize: 9,
    lineHeight: 12,
    textAlign: "center",
    color: "#45644B",
  },

  infoBox: {
    marginTop: 18,
    padding: 15,
    borderRadius: 14,
    backgroundColor: "#E9F5F5",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
    color: "#456668",
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

  buttonPressed: {
    opacity: 0.75,
  },
});