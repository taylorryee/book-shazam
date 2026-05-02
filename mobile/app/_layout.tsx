import { Stack } from "expo-router";
import {useFonts} from "expo-font"
import { useEffect } from "react";

import { useAuthStore } from "../authStore";

export default function RootLayout() {
    const [loaded] = useFonts({
    "EBGaramond-Regular": require("../assets/fonts/EBGaramond-Regular.ttf"),

  });
  const hydrateAuth = useAuthStore((state) => state.hydrateAuth);

  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);


  if (!loaded) return null;

return (
  <Stack>
    <Stack.Screen name="index" options={{ headerShown: false }} />
    <Stack.Screen name="login" options={{ headerShown: false }} />
    <Stack.Screen name="bookPages" options={{ headerTitle: "" }} />
    <Stack.Screen name="processing" options={{ headerTitle: "" }} />
  </Stack>
);
}
