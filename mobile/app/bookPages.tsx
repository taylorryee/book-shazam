import {useState,useEffect,useRef} from "react"
import {View,Button,TextInput,StyleSheet,Text,ScrollView,TextLayoutLine, ActivityIndicator,InteractionManager,Pressable } from "react-native"
import {api,streamQuery} from "../api"
import {useBookStore,Page} from "../store"
import PagerView from "react-native-pager-view";
import SelectableText from "../components/SelectableText"



export default function Shazam() {
  const SelectedBook = useBookStore((state) => state.selectedBook);

  if (!SelectedBook || !SelectedBook.book.text || !SelectedBook.book.id) return null;

  const LINE_HEIGHT = 26;
  const PAGE_PADDING = 20;
  const DOUBLE_TAP_DELAY = 300;

  const [pageHeight, setPageHeight] = useState(0);
  const [lines, setLines] = useState<TextLayoutLine[]>([]);
  const [pages, setPages] = useState<string[]>([]);
  const [pageIndex, setPageIndex] = useState(SelectedBook.progress ?? 0);
  const [isReady, setIsReady] = useState(false);

  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const lastTapRef = useRef(0);
  const inputRef = useRef<TextInput>(null);

  const linesPerPage = Math.floor((pageHeight - 2 * PAGE_PADDING) / LINE_HEIGHT);

  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const queryLLM = async (path:string, text: string, book_id: number, progress: number) => {
    try {
      setAnswer("");
      setLoading(true);

      await streamQuery({
        path,
        text,
        book_id,
        progress,
        onChunk: (chunk) => {
          setAnswer((prev) => prev + chunk);
        },
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

    

  const savePageToDB = async (id: number, progress: number) => {
    try {
      const response = await api.post("/book/position", { id, progress });
      console.log(response.data, "book page saved");
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (lines.length > 0 && pageHeight > 0 && linesPerPage > 0) {
      const newPages: string[] = [];

      for (let i = 0; i < lines.length; i += linesPerPage) {
        const chunk = lines.slice(i, i + linesPerPage);
        newPages.push(chunk.map((l) => l.text).join(""));
      }

      setPages(newPages);
      setIsReady(true);
    }
  }, [lines, pageHeight, linesPerPage]);

  useEffect(() => {
    if (SelectedBook.progress != null) {
      setPageIndex(SelectedBook.progress);
    }
  }, [SelectedBook.progress]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (SelectedBook.book.id) {
        savePageToDB(SelectedBook.book.id, pageIndex);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [pageIndex]);

  useEffect(() => {
    console.log(pageIndex);
  }, [pageIndex]);

  useEffect(() => {
    if (showInput) {
      const timeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);

      return () => clearTimeout(timeout);
    }
  }, [showInput]);

  const handleTap = () => {
    const now = Date.now();

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      setShowInput(true);
    }

    lastTapRef.current = now;
  };




const wsRef = useRef<WebSocket | null>(null);
const [connected, setConnected] = useState(false);


useEffect(() => {
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
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === "delta") {
      setAnswer((prev) => prev + msg.text);
    }

    if (msg.type === "done") {
      console.log("✅ Finished response");
    }

    if (msg.type === "error") {
      console.error(msg.message);
    }
  };

  return () => {
    ws.close(); // cleanup when component unmounts
  };
}, []);

const sendQuery = (text: string, book_id: number, progress: number) => {
  if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
    console.log("WebSocket not ready");
    return;
  }

  // clear old answer
  setAnswer("");

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
      {/* Hidden measurement */}
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
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <PagerView
            style={{ flex: 1 }}
            initialPage={pageIndex}
            onPageSelected={(e) => setPageIndex(e.nativeEvent.position)}
          >
            {pages.map((pageText, i) => (
              <View key={i} style={{ flex: 1 }}>
                <Pressable style={{ flex: 1 }} onPress={handleTap}>
                  <View style={{ flex: 1, padding: 20 }}>
                    <Text selectable style={{ lineHeight: LINE_HEIGHT }}>
                      {pageText}
                    </Text>
                  </View>
                </Pressable>
              </View>
            ))}
          </PagerView>

          {showInput && (
            <View style={styles.overlay}>
              <View style={styles.inputBox}>
                <TextInput
                  ref={inputRef}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Type here..."
                  multiline
                  style={styles.input}
                />
                <Pressable style={styles.closeButton} onPress={()=>sendQuery(query,SelectedBook.book.id!,SelectedBook.progress)}>
                <Text>Ask</Text>
                </Pressable>
                <Pressable
                  style={styles.closeButton}
                  onPress={() => setShowInput(false)}
                >
                  <Text>Close</Text>
                </Pressable>
              </View>
              <Text>{answer}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  inputBox: {
    width: "85%",
    minHeight: 160,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
  },
  input: {
    flex: 1,
    minHeight: 100,
    textAlignVertical: "top",
  },
  closeButton: {
    marginTop: 12,
    alignSelf: "flex-end",
  },
});
