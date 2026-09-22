import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AuthProvider } from "../context/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
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
          name="delete-account"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="admin"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </AuthProvider>
  );
}