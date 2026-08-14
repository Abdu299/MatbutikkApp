import { isRunningInExpoGo } from "expo";
import {
  router,
  Stack,
  type Href,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";

import { AuthProvider } from "../context/AuthContext";

type NotificationLike = {
  request: {
    identifier: string;
    content: {
      data?: Record<string, unknown> | null;
    };
  };
};

function NotificationBootstrap() {
  const lastHandledNotificationId =
    useRef<string | null>(null);

  useEffect(() => {
    /*
     * Remote push notifications do not work in Expo Go.
     * We avoid loading expo-notifications there so the
     * app can still be tested normally without warnings
     * or push-registration errors.
     */
    if (isRunningInExpoGo()) {
      return;
    }

    let isDisposed = false;

    let responseSubscription: {
      remove: () => void;
    } | null = null;

    function openNotification(
      notification: NotificationLike
    ) {
      const notificationId =
        notification.request.identifier;

      if (
        lastHandledNotificationId.current ===
        notificationId
      ) {
        return;
      }

      const url =
        notification.request.content.data?.url;

      if (
        typeof url !== "string" ||
        !url.trim()
      ) {
        return;
      }

      lastHandledNotificationId.current =
        notificationId;

      router.push(url as Href);
    }

    async function configureNotifications() {
      const Notifications =
        await import("expo-notifications");

      if (isDisposed) {
        return;
      }

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      const lastResponse =
        Notifications.getLastNotificationResponse();

      if (
        lastResponse?.notification &&
        !isDisposed
      ) {
        openNotification(
          lastResponse.notification as NotificationLike
        );
      }

      responseSubscription =
        Notifications.addNotificationResponseReceivedListener(
          (response) => {
            openNotification(
              response.notification as NotificationLike
            );
          }
        );
    }

    void configureNotifications().catch(
      (error) => {
        console.error(
          "Kunne ikke konfigurere varsler:",
          error
        );
      }
    );

    return () => {
      isDisposed = true;
      responseSubscription?.remove();
    };
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationBootstrap />

      <StatusBar style="dark" />

      <Stack
        screenOptions={{
          headerBackTitle: "Tilbake",
          headerTintColor: "#1F7A3D",
          headerTitleStyle: {
            fontWeight: "800",
          },
          headerStyle: {
            backgroundColor: "#FFFFFF",
          },
          contentStyle: {
            backgroundColor: "#F5F7F5",
          },
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />

        {/*
         * Admin is a nested navigator because
         * app/admin/_layout.tsx exists.
         *
         * Do not list admin/index, admin/add-offer,
         * etc. here. Those routes are controlled by
         * the nested admin layout.
         */}
        <Stack.Screen
          name="admin"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="offer-details"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="product-details"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="offer-control"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="personal-information"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="modal"
          options={{
            presentation: "modal",
            title: "Informasjon",
          }}
        />
      </Stack>
    </AuthProvider>
  );
}