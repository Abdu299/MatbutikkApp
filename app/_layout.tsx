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
          name="admin/index"
          options={{
            title: "Adminpanel",
          }}
        />

        <Stack.Screen
          name="admin/add-product"
          options={{
            title: "Legg til produkt",
          }}
        />

        <Stack.Screen
          name="admin/add-offer"
          options={{
            title: "Legg til tilbud",
          }}
        />

        <Stack.Screen
          name="admin/manage-products"
          options={{
            title: "Administrer produkter",
          }}
        />

        <Stack.Screen
          name="admin/manage-offers"
          options={{
            title: "Administrer tilbud",
          }}
        />

        <Stack.Screen
          name="admin/edit-product"
          options={{
            title: "Rediger produkt",
          }}
        />

        <Stack.Screen
          name="admin/edit-offer"
          options={{
            title: "Rediger tilbud",
          }}
        />

        <Stack.Screen
          name="admin/login"
          options={{
            title: "Logg inn",
          }}
        />
      </Stack>
    </AuthProvider>
  );
}