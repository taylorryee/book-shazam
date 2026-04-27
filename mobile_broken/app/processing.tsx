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
    const pages = useBookStore((state)=>state.pages)

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
    
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms)) //Promise syntax is Promise(resolve,reject => {code to run ... then either resolve() for success or reject() for failure}) In our case we simply run setTimeout which will not fail
    //so we can just do setTimeout then have it run resolve when it finishes to return the promise. We can now await this sleep function in processBook because it is a Promise that runs setTimeout.
    // Now we can use sleep in processBook using await sleep(1000) to actually pause the async function as it will await as long as the Promise is not resolved - which will happen when setTimeout finishes. 
    // If we just did await setTimeout(...) it would not wait, because setTimeout is non-blocking

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

    const embedPages = async (pages:Page[])=>{
        try{
            if(!selectedBook)return;
            const response = await api.post("/book/embed", {pages: pages,book_id: selectedBook.book.id})
            //console.log(response.data)
        }catch(e:any){
            console.error(e)
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
            let page_num = 0
            for (let i = 0; i < lines.length; i += linesPerPage) {
                const chunk = lines.slice(i, i + linesPerPage);
                const newText = chunk.map((l) => l.text).join("")
                const newPage:Page = {
                    text:newText,
                    index:page_num
                }
                newPages.push(newPage)
                page_num++;
                
                //newPages.push(chunk.map((l) => l.text).join(""));
            }

        setPages(newPages);
        setDidPaginate(true)
        //await embedPages(pages)
        try{
            const response = await embedPages(newPages)
        }catch(e:any){
            console.error(e)
        }

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