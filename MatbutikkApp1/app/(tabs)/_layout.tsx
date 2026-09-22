import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#5A1B6F",
        tabBarInactiveTintColor: "#77727A",
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: 82,
          paddingTop: 8,
          paddingBottom: 18,
          backgroundColor: "#F7F2F8",
          borderTopWidth: 1,
          borderTopColor: "#E4D8E8",
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
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "pricetag" : "pricetag-outline"}
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
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "basket" : "basket-outline"}
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
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
