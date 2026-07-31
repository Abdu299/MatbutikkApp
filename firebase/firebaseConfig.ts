import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import * as FirebaseAuth from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";


// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAqiR8J-hpKYLNl53iOdU5p6FeWs39ulgI",
  authDomain: "matbutikk-app.firebaseapp.com",
  databaseURL: "https://matbutikk-app-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "matbutikk-app",
  storageBucket: "matbutikk-app.firebasestorage.app",
  messagingSenderId: "1062893067721",
  appId: "1:1062893067721:web:903577a9a7040ecd1f9c18",
  measurementId: "G-7WC0DRKDL1"
};
const app =
  getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApp();

function createAuth() {
  if (Platform.OS === "web") {
    return FirebaseAuth.getAuth(app);
  }

  try {
    const getReactNativePersistence = (
      FirebaseAuth as typeof FirebaseAuth & {
        getReactNativePersistence: (
          storage: typeof AsyncStorage
        ) => FirebaseAuth.Persistence;
      }
    ).getReactNativePersistence;

    return FirebaseAuth.initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    return FirebaseAuth.getAuth(app);
  }
}

export const auth = createAuth();
export const db = getFirestore(app);

export default app;