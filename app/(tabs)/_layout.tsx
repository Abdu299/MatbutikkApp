import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import {
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useEffect } from "react";
import { AppState } from "react-native";

import { auth, db } from "../../firebase/firebaseConfig";
import {
  registerForPushNotificationsAsync,
} from "../../services/pushNotifications";

export default function TabsLayout() {
  useEffect(() => {
    let currentUser: User | null = auth.currentUser;

    let lastTrackedUserId: string | null = null;
    let lastActivityWriteAt = 0;
    let notificationRegistrationUserId:
      | string
      | null = null;

    async function updateUserActivity(
      user: User | null
    ) {
      if (!user) {
        lastTrackedUserId = null;
        return;
      }

      const now = Date.now();

      const userChanged =
        lastTrackedUserId !== user.uid;

      const fiveMinutesHavePassed =
        now - lastActivityWriteAt >=
        5 * 60 * 1000;

      if (
        !userChanged &&
        !fiveMinutesHavePassed
      ) {
        return;
      }

      lastTrackedUserId = user.uid;
      lastActivityWriteAt = now;

      try {
        await updateDoc(
          doc(db, "users", user.uid),
          {
            lastActiveAt: serverTimestamp(),
          }
        );
      } catch (error) {
        console.error(
          "Feil ved oppdatering av lastActiveAt:",
          error
        );
      }
    }

    async function registerNotifications(
      user: User | null
    ) {
      if (!user) {
        notificationRegistrationUserId = null;
        return;
      }

      if (
        notificationRegistrationUserId ===
        user.uid
      ) {
        return;
      }

      notificationRegistrationUserId = user.uid;

      await registerForPushNotificationsAsync(
        user.uid
      );
    }

    const unsubscribeFromAuth =
      onAuthStateChanged(auth, (user) => {
        currentUser = user;

        void updateUserActivity(user);
        void registerNotifications(user);
      });

    const appStateSubscription =
      AppState.addEventListener(
        "change",
        (nextAppState) => {
          if (nextAppState === "active") {
            void updateUserActivity(currentUser);
          }
        }
      );

    return () => {
      unsubscribeFromAuth();
      appStateSubscription.remove();
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1F7A3D",
        tabBarInactiveTintColor: "#777777",
        tabBarStyle: {
          height: 82,
          paddingTop: 8,
          paddingBottom: 18,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E5E5E5",
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tilbud",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="pricetag-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="products"
        options={{
          title: "Nye produkter",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="basket-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="person-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}