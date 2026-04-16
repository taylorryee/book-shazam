import { useState, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  ScrollView,
  TextLayoutLine,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { api } from "../api";
import { useBookStore } from "../store";
import PagerView from "react-native-pager-view";

export default function Shazam() {
  const SelectedBook = useBookStore((state) => state.selectedBook);

  if (!SelectedBook || !SelectedBook.book.text || !SelectedBook.book.id) return null;

  const LINE_HEIGHT = 26;
  const PAGE_PADDING = 20;
  const DOUBLE_TAP_DELAY = 300;

  const [pageHeight, setPageHeight] = useState(0);
  const [lines, setLines] = useState<TextLayoutLine[]>([]);
  //const [pages, setPages] = useState<string[]>([]);
  const pages = useBookStore((state)=>state.pages)
  const [pageIndex, setPageIndex] = useState(SelectedBook.progress ?? 0);
  //const [isReady, setIsReady] = useState(false);
  const isReady = pages.length > 0;

  const [showInput, setShowInput] = useState(false);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  const lastTapRef = useRef(0);
  const inputRef = useRef<TextInput>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const answerScrollRef = useRef<ScrollView>(null);

  const linesPerPage = Math.floor((pageHeight - 2 * PAGE_PADDING) / LINE_HEIGHT);

  const savePageToDB = async (id: number, progress: number) => {
    try {
      const response = await api.post("/book/position", { id, progress });
      console.log(response.data, "book page saved");
    } catch (e) {
      console.error(e);
    }
  };

  // useEffect(() => {
  //   if (lines.length > 0 && pageHeight > 0 && linesPerPage > 0) {
  //     const newPages: string[] = [];

  //     for (let i = 0; i < lines.length; i += linesPerPage) {
  //       const chunk = lines.slice(i, i + linesPerPage);
  //       newPages.push(chunk.map((l) => l.text).join(""));
  //     }

  //     setPages(newPages);
  //     setIsReady(true);
  //   }
  // }, [lines, pageHeight, linesPerPage]);

  useEffect(() => {
    if (SelectedBook.progress != null) {
      setPageIndex(SelectedBook.progress);
    }
  }, [SelectedBook.progress]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (SelectedBook.book.id != null) {
        savePageToDB(SelectedBook.book.id, pageIndex);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [pageIndex, SelectedBook.book.id]);

  useEffect(() => {
    if (showInput) {
      const timeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);

      return () => clearTimeout(timeout);
    }
  }, [showInput]);

  // useEffect(() => {
  //   if (answer.length > 0) {
  //     answerScrollRef.current?.scrollToEnd({ animated: true });
  //   }
  // }, [answer]);

  const handleTap = () => {
    const now = Date.now();

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      setShowInput(true);
    }

    lastTapRef.current = now;
  };

  useEffect(() => { //Establish websocket connection on intial launch
    const ws = new WebSocket("ws://192.168.1.30:8000/shazam/ws/query");

    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ Connected");
      setConnected(true);
    };

    ws.onclose = () => {
      console.log("❌ Disconnected");
      setConnected(false);
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
        console.log("✅ Finished response");
        setLoading(false);
      }

      if (msg.type === "error") {
        console.error(msg.message);
        setLoading(false);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const sendQuery = (text: string, book_id: number, progress: number) => {
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

  return (
    <View
      style={{ flex: 1 }}
      onLayout={(e) => setPageHeight(e.nativeEvent.layout.height)}
    >
      <View style={{ position: "absolute", opacity: 0, padding: 20 }}>
        <Text
          style={{ lineHeight: LINE_HEIGHT }}
          onTextLayout={(e) => {
            if (lines.length === 0) setLines(e.nativeEvent.lines);
          }}
        >
          {SelectedBook.book.text}
        </Text>
      </View>

      {!isReady ? (
        <View style={styles.loadingScreen}>
          <ActivityIndicator />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <PagerView
            style={{ flex: 1 }}
            initialPage={pageIndex}
            onPageSelected={(e) => setPageIndex(e.nativeEvent.position)}
          >
            {pages.map((page) => (
              <View key={page.index} style={{ flex: 1 }}>
                <Pressable style={{ flex: 1 }} onPress={handleTap}>
                  <View style={{ flex: 1, padding: 20 }}>
                    <Text selectable style={{ lineHeight: LINE_HEIGHT }}>
                      {page.text}
                    </Text>
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
                    onPress={() => sendQuery(query, SelectedBook.book.id!, pageIndex)}
                  >
                    <Text style={styles.buttonText}>Ask</Text>
                  </Pressable>

                  <Pressable
                    style={styles.closeButton}
                    onPress={() => {
                      setShowInput(false);
                      setQuery("");
                      setAnswer("");
                      setLoading(false);
                    }}
                  >
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
                      // onContentSizeChange={() =>
                      //   answerScrollRef.current?.scrollToEnd({ animated: true })
                      // }
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
