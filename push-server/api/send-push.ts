import {
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

type NotificationType = "offer" | "product";

type RequestBody = {
  type?: NotificationType;
  itemId?: string;
  contentName?: string;
};

type ExpoTicket = {
  status?: "ok" | "error";
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
};

function getFirebaseAdminApp() {
  const existingApp = getApps()[0];

  if (existingApp) {
    return existingApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail =
    process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey =
    process.env.FIREBASE_PRIVATE_KEY?.replace(
      /\\n/g,
      "\n"
    );

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin environment variables are missing."
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

function getBearerToken(
  authorizationHeader: unknown
) {
  if (typeof authorizationHeader !== "string") {
    return null;
  }

  const [scheme, token] =
    authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

function isExpoPushToken(value: unknown) {
  return (
    typeof value === "string" &&
    (value.startsWith("ExpoPushToken[") ||
      value.startsWith("ExponentPushToken["))
  );
}

function splitIntoChunks<T>(
  values: T[],
  size: number
) {
  const chunks: T[][] = [];

  for (
    let index = 0;
    index < values.length;
    index += size
  ) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

export default async function handler(
  request: any,
  response: any
) {
  if (request.method === "OPTIONS") {
    response.setHeader(
      "Access-Control-Allow-Methods",
      "POST, OPTIONS"
    );
    response.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization, Content-Type"
    );
    return response.status(204).end();
  }

  if (request.method !== "POST") {
    return response.status(405).json({
      error: "Method not allowed.",
    });
  }

  try {
    const firebaseApp = getFirebaseAdminApp();

    const idToken = getBearerToken(
      request.headers.authorization
    );

    if (!idToken) {
      return response.status(401).json({
        error: "Firebase ID token is missing.",
      });
    }

    const decodedToken = await getAuth(
      firebaseApp
    ).verifyIdToken(idToken);

    const firestore = getFirestore(firebaseApp);

    const adminUserSnapshot = await firestore
      .collection("users")
      .doc(decodedToken.uid)
      .get();

    if (
      !adminUserSnapshot.exists ||
      adminUserSnapshot.data()?.role !== "admin"
    ) {
      return response.status(403).json({
        error:
          "Only an administrator can send push notifications.",
      });
    }

    const {
      type,
      itemId,
      contentName,
    } = (request.body ?? {}) as RequestBody;

    if (
      (type !== "offer" && type !== "product") ||
      typeof itemId !== "string" ||
      !itemId.trim() ||
      typeof contentName !== "string" ||
      !contentName.trim()
    ) {
      return response.status(400).json({
        error: "Invalid notification data.",
      });
    }

    const usersSnapshot = await firestore
      .collection("users")
      .get();

    const tokenSet = new Set<string>();

    usersSnapshot.forEach((userDocument) => {
      const userData = userDocument.data();

      if (
        userData.role === "admin" ||
        userData.notificationsEnabled === false
      ) {
        return;
      }

      const storedTokens = Array.isArray(
        userData.expoPushTokens
      )
        ? userData.expoPushTokens
        : [];

      storedTokens.forEach((token: unknown) => {
        if (isExpoPushToken(token)) {
          tokenSet.add(token);
        }
      });
    });

    const tokens = [...tokenSet];

    if (tokens.length === 0) {
      return response.status(200).json({
        recipients: 0,
        sent: 0,
        failed: 0,
      });
    }

    const notificationTitle =
      type === "offer"
        ? "New offer available"
        : "New product available";

    const notificationUrl =
      type === "offer"
        ? `/offer-details?id=${encodeURIComponent(
            itemId
          )}`
        : `/product-details?id=${encodeURIComponent(
            itemId
          )}`;

    const messages = tokens.map((token) => ({
      to: token,
      sound: "default",
      title: notificationTitle,
      body: contentName.trim(),
      priority: "high",
      channelId: "default",
      data: {
        url: notificationUrl,
        type,
        itemId,
      },
    }));

    const messageChunks = splitIntoChunks(
      messages,
      100
    );

    let sent = 0;
    let failed = 0;

    for (const messageChunk of messageChunks) {
      const headers: Record<string, string> = {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      };

      if (process.env.EXPO_ACCESS_TOKEN) {
        headers.Authorization =
          `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
      }

      const expoResponse = await fetch(
        "https://exp.host/--/api/v2/push/send",
        {
          method: "POST",
          headers,
          body: JSON.stringify(messageChunk),
        }
      );

      const expoBody = await expoResponse.json();

      if (!expoResponse.ok) {
        throw new Error(
          expoBody?.errors?.[0]?.message ??
            "Expo Push Service returned an error."
        );
      }

      const tickets: ExpoTicket[] = Array.isArray(
        expoBody?.data
      )
        ? expoBody.data
        : [];

      tickets.forEach((ticket) => {
        if (ticket.status === "ok") {
          sent += 1;
        } else {
          failed += 1;
        }
      });
    }

    return response.status(200).json({
      recipients: tokens.length,
      sent,
      failed,
    });
  } catch (error) {
    console.error("Push notification error:", error);

    return response.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Unknown push notification error.",
    });
  }
}
