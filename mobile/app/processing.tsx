import {useState,useEffect} from "react"
import {ScrollView,View,Button,Text,StyleSheet,Pressable,Modal,ActivityIndicator,TextLayoutLine} from "react-native"
import {useBookStore,BookFullText,UserBook,Page} from "../store"
import Book from "../components/book"
import {api} from "../api"
import { useRouter } from "expo-router";
import HiddenTextMeasure from "../components/HiddenTextMeasure"

const LINE_HEIGHT = 26
const PAGE_PADDING = 20

export default function processing() {
    const setSelectedBook = useBookStore((state)=>state.setSelectedBook)
    const selectedBook = useBookStore((state)=>state.selectedBook)
    const processingBook = useBookStore((state)=>state.processingBook)

    const setProcessingBook = useBookStore((state)=>state.setProcessingBook)
    const [lines,setLines] = useState<TextLayoutLine[]>([])

    if(!processingBook)return null;

    useEffect(()=>{

    },[])
    return (
        <View style={{ flex: 1 }}>
            
            {/* Visible UI */}
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" />
                <Text>
                    Processing: {processingBook.title}
                </Text>
            </View>

            {/* Invisible measurement layer */}
            {processingBook && <View
                style={{
                    position: "absolute",
                    opacity: 0,          // invisible
                    zIndex: -1,  
                    padding:PAGE_PADDING        // behind everything
                }}
            >
                <Text
                    style={{ 
                        lineHeight: LINE_HEIGHT }}
                        onTextLayout={(e) => {if (lines.length === 0) setLines(e.nativeEvent.lines);
                    }}
                >
                    {processingBook.text}
                </Text>
            </View>}

        </View>
    );
}