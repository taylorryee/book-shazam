import {useState,useEffect,useRef} from "react"
import {View,Button,TextInput,StyleSheet,Text,ScrollView,TextLayoutLine, ActivityIndicator,InteractionManager } from "react-native"
import api from "../api"
import {useBookStore,Page} from "../store"
import PagerView from "react-native-pager-view";
import SelectableText from "../components/SelectableText"


export default function Shazam() {
  const SelectedBook = useBookStore((state) => state.selectedBook);

  if (!SelectedBook || !SelectedBook.book.text) return null;

  const LINE_HEIGHT = 26;
  const PAGE_PADDING = 20;

  const [pageHeight, setPageHeight] = useState(0);
  const [lines, setLines] = useState<TextLayoutLine[]>([]);
  const [pages, setPages] = useState<string[]>([]);
  const [pageIndex, setPageIndex] = useState(SelectedBook.progress ?? 0);
  const [isReady, setIsReady] = useState(false);
  
  

  const linesPerPage = Math.floor(
    (pageHeight - 2 * PAGE_PADDING) / LINE_HEIGHT
  );

  const savePageToDB= async(id:number,progress:number)=>{
    try{
        const response = await api.post("/book/position",{id,progress})
        console.log(response.data,"book page saved")
    }catch(e){
        console.error(e)
    }
  }

  useEffect(() => {
    if (lines.length > 0 && pageHeight > 0) {
      const newPages: string[] = [];

      for (let i = 0; i < lines.length; i += linesPerPage) {
        const chunk = lines.slice(i, i + linesPerPage);
        newPages.push(chunk.map((l) => l.text).join(""));
      }

      setPages(newPages);
      setIsReady(true)
    }
  }, [lines, pageHeight]);

  useEffect(() => {
    if (SelectedBook.progress != null) {
      setPageIndex(SelectedBook.progress);
    }
  }, [SelectedBook.progress]);

  useEffect(()=>{
    const timeout = setTimeout(() => {
      if(SelectedBook.book.id)
      savePageToDB(SelectedBook.book.id,pageIndex)
    }, 3000);

    return () => clearTimeout(timeout); 
  },[pageIndex])

  useEffect(()=>{console.log(pageIndex)},[pageIndex])
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

      {/* Pager */}
   {!isReady ? (
      // 👇 Smooth loading state instead of flicker
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    ) : (
      <PagerView
        style={{ flex: 1 }}
        initialPage={pageIndex}
        onPageSelected={(e) => setPageIndex(e.nativeEvent.position)}
      >
        {pages.map((pageText, i) => (
          <View key={i} style={{ flex: 1, padding: 20 }}>
            <Text selectable style={{ lineHeight: LINE_HEIGHT }}>{pageText}</Text>
          </View>
        ))}
      </PagerView>
    )}
    </View>
  );
}
