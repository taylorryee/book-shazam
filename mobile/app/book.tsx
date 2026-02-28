
import { View, Text, Button } from "react-native";
import { useRouter } from "expo-router";

export default function Book() {
  const router = useRouter();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Welcome to Book Screen</Text>
      
      {/* Go back button */}
      <Button title="Go Back" onPress={() => router.back()} />
    </View>
  );
}