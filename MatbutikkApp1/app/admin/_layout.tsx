import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function AdminLayout() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#F5F7F5",
        }}
        edges={["top"]}
      >
        <Stack
          initialRouteName="index"
          screenOptions={{
            headerShown: false,
            gestureEnabled: false,
            contentStyle: {
              backgroundColor: "#F5F7F5",
            },
          }}
        />
      </SafeAreaView>
    </>
  );
}