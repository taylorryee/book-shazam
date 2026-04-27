import { Stack } from "expo-router";
import {useFonts} from "expo-font"

export default function RootLayout() {
    const [loaded] = useFonts({
    "EBGaramond-Regular": require("../assets/fonts/EBGaramond-Regular.ttf"),

  });


  if (!loaded) return null;

  return <Stack>
      <Stack.Screen name="bookPages" options={{ headerTitle: "" }} />
      <Stack.Screen name="processing" options={{ headerTitle: "" }} />
    </Stack>;
}
