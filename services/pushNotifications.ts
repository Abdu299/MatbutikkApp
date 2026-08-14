import { isRunningInExpoGo } from "expo";
import Constants from "expo-constants";
import {
  arrayUnion,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { Platform } from "react-native";

import {
  auth,
  db,
} from "../firebase/firebaseConfig";

const EAS_PROJECT_ID =
  "1bce35a0-2438-49cb-bb9b-070cd09b1bf9";

export type NewContentNotificationType =
  | "offer"
  | "product";

type SendNewContentNotificationInput = {
  type: NewContentNotificationType;
  itemId: string;
  contentName: string;
};

type SendPushResult = {
  recipients: number;
  sent: number;
  failed: number;
};

function getExpoProjectId() {
  return (
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    EAS_PROJECT_ID
  );
}

function getPushApiUrl() {
  return (
    process.env.EXPO_PUBLIC_PUSH_API_URL ??
    Constants.expoConfig?.extra?.pushApiUrl
  );
}

export async function registerForPushNotificationsAsync(
  userId: string
) {
  if (Platform.OS === "web") {
    return null;
  }

  /*
   * Expo Go cannot receive remote push
   * notifications. Push registration starts
   * only in an installed development or
   * production build.
   */
  if (isRunningInExpoGo()) {
    return null;
  }

  try {
    const Notifications =
      await import("expo-notifications");

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(
        "default",
        {
          name: "Nye tilbud og produkter",
          importance:
            Notifications.AndroidImportance.MAX,
          vibrationPattern: [
            0,
            250,
            250,
            250,
          ],
          lightColor: "#1F7A3D",
          sound: "default",
        }
      );
    }

    const currentPermissions =
      await Notifications.getPermissionsAsync();

    let finalStatus =
      currentPermissions.status;

    if (finalStatus !== "granted") {
      const requestedPermissions =
        await Notifications.requestPermissionsAsync();

      finalStatus =
        requestedPermissions.status;
    }

    if (finalStatus !== "granted") {
      console.log(
        "Brukeren ga ikke tillatelse til push-varsler."
      );

      return null;
    }

    const projectId = getExpoProjectId();

    if (!projectId) {
      throw new Error(
        "EAS projectId mangler."
      );
    }

    const tokenResponse =
      await Notifications.getExpoPushTokenAsync({
        projectId,
      });

    const expoPushToken =
      tokenResponse.data;

    /*
     * updateDoc changes only these notification
     * fields. Existing role, name and email are
     * preserved.
     */
    await updateDoc(
      doc(db, "users", userId),
      {
        expoPushTokens:
          arrayUnion(expoPushToken),

        notificationsEnabled: true,

        pushTokenUpdatedAt:
          serverTimestamp(),
      }
    );

    return expoPushToken;
  } catch (error) {
    console.error(
      "Kunne ikke registrere push-varsler:",
      error
    );

    return null;
  }
}

export async function sendNewContentPushNotification({
  type,
  itemId,
  contentName,
}: SendNewContentNotificationInput): Promise<SendPushResult> {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error(
      "Du må være logget inn som admin for å sende push-varsler."
    );
  }

  const pushApiUrl = getPushApiUrl();

  if (!pushApiUrl) {
    throw new Error(
      "EXPO_PUBLIC_PUSH_API_URL mangler i .env."
    );
  }

  const idToken =
    await currentUser.getIdToken();

  const response = await fetch(pushApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type,
      itemId,
      contentName,
    }),
  });

  const responseBody =
    await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage =
      responseBody?.error ??
      "Push-serveren returnerte en ukjent feil.";

    throw new Error(errorMessage);
  }

  return {
    recipients: Number(
      responseBody?.recipients ?? 0
    ),

    sent: Number(
      responseBody?.sent ?? 0
    ),

    failed: Number(
      responseBody?.failed ?? 0
    ),
  };
}