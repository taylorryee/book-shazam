import { ActivityIndicator, View } from "react-native";
import { useEffect } from "react";
import { useRouter } from "expo-router";

import { useAuthStore } from "../authStore";

export default function Index() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const isLoadingAuth = useAuthStore((state) => state.isLoadingAuth);

  useEffect(() => {
    if (isLoadingAuth) {
      return;
    }

    router.replace(token ? "/bookFind" : "/login");
  }, [isLoadingAuth, router, token]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ActivityIndicator size="large" />
    </View>
  );
}
