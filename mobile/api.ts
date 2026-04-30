// api/client.ts
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// const API_BASE_URL = "http://192.168.1.22:8000"
const API_BASE_URL = "https://book-shazam.onrender.com";
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔑 attach token automatically
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);


// api/streamQuery.ts


type QueryArgs = {
  path:string
  text: string;
  book_id: number;
  progress: number;
  onChunk: (chunk: string) => void;
};


async function getAuthHeaders(extra: Record<string, string> = {}) {
  const token = await AsyncStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export async function streamQuery({
  path,
  text,
  book_id,
  progress,
  onChunk,
}: QueryArgs) {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ text, book_id, progress }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Streaming body not available in this runtime");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        onChunk(decoder.decode(value, { stream: true }));
      }
    }
  } finally {
    reader.releaseLock();
  }
}