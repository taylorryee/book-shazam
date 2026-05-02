import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import { api } from "./api";

type AuthStore = {
  token: string | null;
  isLoadingAuth: boolean;
  hydrateAuth: () => Promise<void>;
  login: (username: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  isLoadingAuth: true,

  hydrateAuth: async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      set({ token, isLoadingAuth: false });
    } catch (e) {
      console.error("Failed to load auth token", e);
      set({ token: null, isLoadingAuth: false });
    }
  },

  login: async (username: string) => {
    const response = await api.post("/user/login", { username });
    const token = response.data.access_token;

    await AsyncStorage.setItem("token", token);
    set({ token, isLoadingAuth: false });
  },

  logout: async () => {
    await AsyncStorage.removeItem("token");
    set({ token: null, isLoadingAuth: false });
  },
}));
