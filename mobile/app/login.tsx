import { useEffect, useState } from "react";
import { ActivityIndicator, Button, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { useAuthStore } from "../authStore";

export default function Login() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const isLoadingAuth = useAuthStore((state) => state.isLoadingAuth);
  const login = useAuthStore((state) => state.login);
  const [userName, setUserName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth && token) {
      router.replace("/bookFind");
    }
  }, [isLoadingAuth, router, token]);

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      setError(null);
      await login(userName);
      router.replace("/bookFind");
    } catch (e) {
      console.error(e);
      setError("Could not log in");
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isLoadingAuth) {
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

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <TextInput
        placeholder="username"
        onChangeText={setUserName}
        value={userName}
        autoCapitalize="none"
        style={{
          width: "100%",
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          marginBottom: 12,
          backgroundColor: "#fff",
        }}
      />
      <Button
        title={isLoggingIn ? "Logging in..." : "Login"}
        onPress={handleLogin}
        disabled={isLoggingIn || !userName.trim()}
      />
      {error ? <Text style={{ marginTop: 12, color: "red" }}>{error}</Text> : null}
    </View>
  );
}
