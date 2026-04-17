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
    const router= useRouter()
    const [pageHeight, setPageHeight] = useState(0)
    const [pageWidth,setPageWidth] = useState(0)
    const LINE_HEIGHT = 26;
    const PAGE_PADDING = 20;
    const linesPerPage = Math.floor((pageHeight - 2 * PAGE_PADDING) / LINE_HEIGHT);


    const setSelectedBook = useBookStore((state)=>state.setSelectedBook)
    const selectedBook = useBookStore((state)=>state.selectedBook)
    const processingBook = useBookStore((state)=>state.processingBook)
    const setProcessingBook = useBookStore((state)=>state.setProcessingBook)
    const setPages = useBookStore((state)=>state.setPages)

    const [bookProcessed,setBookProcessed] = useState(false)

    const [lines,setLines] = useState<TextLayoutLine[]>([])

    if(!processingBook)return null;

    const addBook = async(book:BookFullText) => {
        try{
            const response = await api.post("/book/add",book)
            return response.data
        }catch(e:any){
            console.error(e)
        }
    }
    
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms)) 
    const processBook = async (book:UserBook):Promise<UserBook> => { //cleans book
        const response = await api.post("/book/process",book)
        if (response.data.book.process_level != "processed"){
            await sleep(1000)
            const processed = await processBook(book) //Recursivly call processBook untill the book is processed. 
            return processed 
        }
        else{
            return response.data
        }
    }

    useEffect(()=>{
        const run = async() => {
            const addedBook = await addBook(processingBook)
            const processedBook = await processBook(addedBook)
            setSelectedBook(processedBook)
            setBookProcessed(true)
        }
    run()},[])
    
    const [didPaginate,setDidPaginate] = useState(false)
    useEffect(() => { //create pages 
        if(didPaginate)return;
        const run = async ()=>{

        
        if (lines.length > 0 && pageHeight > 0 && linesPerPage > 0) {
            const newPages: Page[] = [];
            let index = 0
            for (let i = 0; i < lines.length; i += linesPerPage) {
                const chunk = lines.slice(i, i + linesPerPage);
                const newText = chunk.map((l) => l.text).join("")
                const newPage:Page = {
                    text:newText,
                    index:index
                }
                newPages.push(newPage)
                index++;
                
                //newPages.push(chunk.map((l) => l.text).join(""));
            }

        setPages(newPages);
        setDidPaginate(true)
        //await embedPages(pages)
        router.replace("/bookPages")
        }  
       
    };run()}, [lines, pageHeight, linesPerPage]);

    return (
        <View style={{ flex: 1 }} onLayout={(e) => {
            setPageWidth(e.nativeEvent.layout.width);
            setPageHeight(e.nativeEvent.layout.height);
        }}>
            
            {/* Visible UI */}
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" />
                <Text>
                    Processing: {processingBook.title}
                </Text>
            </View>

            {/* Invisible measurement layer */}
            {bookProcessed && selectedBook && <View
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
                    {selectedBook.book.text}
                </Text>
            </View>}

        </View>
    );
}