import { Text, View ,Button} from "react-native";
import {useRouter} from 'expo-router';

export default function Index() {
  const router = useRouter()
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>DA BOOK SHAZAM</Text>
      <Button title="Go to Profile" onPress={() => router.push('/book')} />
    </View>
  );
}

