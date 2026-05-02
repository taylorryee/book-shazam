import { useState, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Keyboard
} from "react-native";
import { Image } from "expo-image";
import { api } from "../api";
import { useBookStore } from "../store";
import PagerView from "react-native-pager-view";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DOUBLE_TAP_DELAY = 300;

export default function Shazam() {
  const selectedBook = useBookStore((state) => state.selectedBook);
  const pages = useBookStore((state) => state.pages);

  const [pageIndex, setPageIndex] = useState(selectedBook?.progress ?? 0);
  const [showInput, setShowInput] = useState(false);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  const lastTapRef = useRef(0);
  const inputRef = useRef<TextInput>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const answerScrollRef = useRef<ScrollView>(null);

  const coverUri = selectedBook?.book.cover_image_url ?? pages[0]?.coverImage ?? undefined;

  useEffect(() => {
    if (coverUri) {
      Image.prefetch(coverUri);
    }
  }, [coverUri]);

  useEffect(() => {
    if (selectedBook?.progress != null) {
      setPageIndex(selectedBook.progress);
    }
  }, [selectedBook?.progress]);

  useEffect(() => {
    if (pages.length > 0 && pageIndex > pages.length - 1) {
      setPageIndex(pages.length - 1);
    }
  }, [pageIndex, pages.length]);

  useEffect(() => {
    if (!selectedBook?.book?.id || pages.length === 0) return;

    const timeout = setTimeout(() => {
      savePageToDB(selectedBook.book.id!, pageIndex);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [pageIndex, pages.length, selectedBook?.book?.id]);

  useEffect(() => {
    if (showInput) {
      const timeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);

      return () => clearTimeout(timeout);
    }
  }, [showInput]);

useEffect(() => {
  let isMounted = true;
  let retryDelay = 2000;

  const connectWebSocket = async () => {
    if (!isMounted) return;

    const token = await AsyncStorage.getItem("token");
    if (!token) return;

    if (wsRef.current) {
      wsRef.current.close();
    }

    // const ws = new WebSocket(
    //   `wss://book-shazam.onrender.com/shazam/ws/query?token=${encodeURIComponent(token)}`
    // ); 
    const ws = new WebSocket(
      `ws://192.168.1.22:8000/shazam/ws/query?token=${encodeURIComponent(token)}`
    );

    wsRef.current = ws;
    ws.onopen = () => {
      if (!isMounted) return;
      console.log("✅ Connected");
      setConnected(true);
      retryDelay = 2000; // reset backoff
    };

    ws.onclose = () => {
      if (!isMounted) return;
      console.log("❌ Disconnected");
      setConnected(false);

      setTimeout(() => {
        connectWebSocket();
      }, retryDelay);

      retryDelay = Math.min(retryDelay * 2, 10000);
    };

    ws.onerror = (e) => {
      console.log("⚠️ WebSocket error", e);
      setLoading(false);
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "delta") {
        setAnswer((prev) => prev + msg.text);
      }

      if (msg.type === "done") {
        setLoading(false);
      }

      if (msg.type === "error") {
        console.error(msg.message);
        setLoading(false);
      }
    };
  };

  connectWebSocket();

  return () => {
    isMounted = false;
    if (wsRef.current) {
      wsRef.current.close();
    }
  };
}, []);


  const savePageToDB = async (id: number, progress: number) => {
    try {
      const response = await api.post("/book/position", { id, progress });
      console.log(response.data, "book page saved");
    } catch (e) {
      console.error(e);
    }
  };

  const handleTap = () => {
    const now = Date.now();

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      setShowInput(true);
    }

    lastTapRef.current = now;
  };

  const sendQuery = (text: string, book_id: number, progress: number) => {
    if (!text.trim()) return;

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log("WebSocket not ready");
      return;
    }

    setAnswer("");
    setLoading(true);

    wsRef.current.send(
      JSON.stringify({
        type: "query",
        text,
        book_id,
        progress,
      })
    );
  };

  const closeModal = () => {
    setShowInput(false);
    setQuery("");
    setAnswer("");
    setLoading(false);
  };

  if (!selectedBook || !selectedBook.book.id) {
    return null;
  }

  if (pages.length === 0) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <PagerView
        style={{ flex: 1 }}
        initialPage={Math.min(pageIndex, pages.length - 1)}
        onPageSelected={(e) => setPageIndex(e.nativeEvent.position)}
      >
        {pages.map((page) => (
          <View key={page.index} style={{ flex: 1 }}>
            <Pressable style={{ flex: 1 }} onPress={handleTap}>
              <View style={page.isCover ? styles.coverPage : styles.page}>
                {page.isCover ? (
                  <Image
                    source={{ uri: page.coverImage ?? coverUri }}
                    style={styles.coverImage}
                    contentFit="cover"
                  />
                  ) : (
                  <Text selectable style={styles.pageText}>
                    {page.text}
                  </Text>
                )}
                {/* <Text selectable style={styles.pageText}>
                  {page.text}
                </Text> */}
              </View>
            </Pressable>
          </View>
        ))}
      </PagerView>

      {showInput && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Ask Shazam</Text>
            <Text style={styles.connectionText}>
              {connected ? "Connected" : "Disconnected"}
            </Text>

            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="Ask about this page..."
              multiline
              style={styles.input}
            />

            <View style={styles.buttonRow}>
              <Pressable
                style={styles.askButton}
                onPress={() => {Keyboard.dismiss();
                  sendQuery(query, selectedBook.book.id!, pageIndex)}
                }
              >
                <Text style={styles.buttonText}>Ask</Text>
              </Pressable>

              <Pressable style={styles.closeButton} onPress={closeModal}>
                <Text style={styles.buttonText}>Close</Text>
              </Pressable>
            </View>

            <View style={styles.answerBox}>
              {loading && answer.length === 0 ? (
                <View style={styles.answerLoading}>
                  <ActivityIndicator />
                  <Text style={styles.answerPlaceholder}>Thinking...</Text>
                </View>
              ) : (
                <ScrollView
                  ref={answerScrollRef}
                  style={styles.answerScroll}
                  contentContainerStyle={styles.answerScrollContent}
                  showsVerticalScrollIndicator
                >
                  <Text style={styles.answerText}>
                    {answer || "Your response will appear here."}
                  </Text>
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  page: {
    flex: 1,
    padding: 20,
    backgroundColor:"#faf7f0"  
  },
coverPage: {
  flex: 1,
  backgroundColor: "#faf7f0",
  justifyContent: "center",
  alignItems: "center",
},
coverImage: {
  width: "85%",
  aspectRatio: 2 / 3,
  borderRadius: 12,
},
  pageText: {
    fontFamily: "EBGaramond-Regular",
    fontSize: 16,
    lineHeight: 26,
    letterSpacing: -0.2,
    color:"#222222"
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    padding: 20,
  },
  modal: {
    width: "92%",
    maxWidth: 500,
    backgroundColor: "#f7f7f7",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "EBGaramond-Regular",
    fontWeight: "600",
    color: "#111",
  },
  connectionText: {
    fontSize: 13,
    color: "#666",
  },
  input: {
    minHeight: 90,
    maxHeight: 140,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    textAlignVertical: "top",
    fontSize: 16,
    color: "#111",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  askButton: {
    backgroundColor: "#111",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  closeButton: {
    backgroundColor: "#666",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
  },
  answerBox: {
    height: 240,
    backgroundColor: "white",
    borderRadius: 14,
    padding: 12,
  },
  answerScroll: {
    flex: 1,
  },
  answerScrollContent: {
    paddingBottom: 8,
  },
  answerText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#111",
  },
  answerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  answerPlaceholder: {
    color: "#666",
    fontSize: 15,
  },
});
