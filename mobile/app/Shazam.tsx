import {useState,useEffect,useRef} from "react"
import {View,Button,TextInput,StyleSheet,Text,ScrollView,TextLayoutLine} from "react-native"
import api from "../api"
import {useBookStore,Page} from "../store"
import PagerView from "react-native-pager-view";


export default function Shazam() {
  const SelectedBook = useBookStore((state) => state.selectedBook);

  if (!SelectedBook || !SelectedBook.text) return null;

  const LINE_HEIGHT = 26;
  const [pageHeight, setPageHeight] = useState(0);
  const [lines, setLines] = useState<TextLayoutLine[]>([]);
  const [pageIndex, setPageIndex] = useState(0);

  //const linesPerPage = Math.floor(pageHeight / LINE_HEIGHT);
  const PAGE_PADDING = 20; // top + bottom
  const linesPerPage = Math.floor((pageHeight - 2 * PAGE_PADDING) / LINE_HEIGHT);

  return (
    <View
      style={{ flex: 1 }}
      onLayout={(e) => setPageHeight(e.nativeEvent.layout.height)}
    >
      {/* Hidden text for line measurement */}
      <View style={{ position: "absolute", opacity: 0,padding:20 }}>
        <Text
          style={{ lineHeight: LINE_HEIGHT }}
          onTextLayout={(e) => {
            if (lines.length === 0) setLines(e.nativeEvent.lines);
          }}
        >
          {SelectedBook.text}
        </Text>
      </View>

      {/* PagerView for swipeable pages */}
      {lines.length>0 && <PagerView
        style={{ flex: 1 }}
        initialPage={pageIndex}
        onPageSelected={(e) => setPageIndex(e.nativeEvent.position)}
      >
        {lines.length > 0 &&
          Array.from({ length: Math.ceil(lines.length / linesPerPage) }).map(
            (_, i) => {
              const start = i * linesPerPage;
              const end = start + linesPerPage;
              const pageLines = lines.slice(start, end);
              const pageText = pageLines.map((l) => l.text).join("");

              return (
                <View key={i} style={{ flex: 1, padding: 20 }}>
                  <Text style={{ lineHeight: LINE_HEIGHT }}>{pageText}</Text>
                </View>
              );
            }
          )}
      </PagerView>}
    </View>
  );
}


const styles = StyleSheet.create({
    textInput:{
         width: "100%",
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          marginBottom: 12,
          backgroundColor: "#fff",
    }
})

