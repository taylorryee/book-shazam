import {useState,useEffect} from "react"
import {View,Text,StyleSheet,ActivityIndicator,TextLayoutLine} from "react-native"
import {useBookStore,BookFullText,UserBook,Page} from "../store"
import {api} from "../api"
import { useRouter } from "expo-router";

const LINE_HEIGHT = 26
const PAGE_PADDING = 20
type BookAddResponse = {
  book: UserBook;
  in_library: boolean;
};

type BackendPage = {
    index: number;
    text: string;
    isCover?: boolean | null;
    coverImage?: string | null;
};

export default function Processing() {
    const router= useRouter()
    const [pageHeight, setPageHeight] = useState(0)
    const linesPerPage = Math.floor((pageHeight - 2 * PAGE_PADDING) / LINE_HEIGHT);


    const setSelectedBook = useBookStore((state)=>state.setSelectedBook)
    const selectedBook = useBookStore((state)=>state.selectedBook)
    const processingBook = useBookStore((state)=>state.processingBook)
    const setPages = useBookStore((state)=>state.setPages)

    const [bookProcessed,setBookProcessed] = useState(false)

    const [lines,setLines] = useState<TextLayoutLine[]>([])
    const [didPaginate,setDidPaginate] = useState(false)

    const addBook = async(book:BookFullText): Promise<BookAddResponse | null> => {
        try{
            const response = await api.post<BookAddResponse>("/book/add",book)
            return response.data
        }catch(e:any){
            console.error(e)
            return null
        }
    }

    // const loadSavedPages = async (userBook: UserBook) => {
    //     if (!userBook.book.id) return false;

    //     const pagesResponse = await api.get<BackendPage[]>("/user/pages", {
    //         params: { book_id: userBook.book.id },
    //     });
    //     const pagesByIndex = new Map<number, BackendPage>();

    //     for (const page of pagesResponse.data) {
    //         pagesByIndex.set(page.index, page);
    //     }

    //     const loadedPages: Page[] = Array.from(pagesByIndex.values())
    //         .sort((a, b) => a.index - b.index)
    //         .map((page) => ({
    //             text: page.text,
    //             index: page.index,
    //             isCover: page.index === 0 ? true : page.isCover ?? false,
    //             coverImage: page.index === 0
    //                 ? userBook.book.cover_image_url
    //                 : page.coverImage ?? null,
    //         }));

    //     const pages =
    //         loadedPages[0]?.index === 0
    //             ? loadedPages
    //             : [
    //                 {
    //                     text: "",
    //                     index: 0,
    //                     isCover: true,
    //                     coverImage: userBook.book.cover_image_url,
    //                 },
    //                 ...loadedPages,
    //             ];

    //     setPages(pages);
    //     return pages.length > 0;
    // }
    const pageCal = async (book:UserBook) =>{
              const pagesResponse = await api.get<BackendPage[]>("/user/pages", {
                params: { book_id: book.book.id },
              });
              const sortedPages = [...pagesResponse.data].sort((a, b) => a.index - b.index);
              const loadedPages: Page[] = sortedPages.map((page) => ({
                text: page.text,
                index: page.index,
                isCover: page.index === 0,
                coverImage: page.index === 0 ? book.book.cover_image_url : null,
              }));
        
              const pages =
                loadedPages[0]?.index === 0
                  ? loadedPages
                  : [
                      {
                        text: "",
                        index: 0,
                        isCover: true,
                        coverImage: book.book.cover_image_url,
                      },
                      ...loadedPages,
                    ];
            setPages(pages)
    }
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms)) //Promise syntax is Promise(resolve,reject => {code to run ... then either resolve() for success or reject() for failure}) In our case we simply run setTimeout which will not fail
    //so we can just do setTimeout then have it run resolve when it finishes to return the promise. We can now await this sleep function in processBook because it is a Promise that runs setTimeout.
    // Now we can use sleep in processBook using await sleep(1000) to actually pause the async function as it will await as long as the Promise is not resolved - which will happen when setTimeout finishes. 
    // If we just did await setTimeout(...) it would not wait, because setTimeout is non-blocking

    const processBook = async (book:UserBook):Promise<UserBook> => { //cleans book
        const response = await api.post("/book/process",book)
        if (response.data.book.process_level !== "processed"){
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
            await api.post("/book/embed", {pages: pages,book_id: selectedBook.book.id})
        }catch(e:any){
            console.error(e)
        }
    }

    useEffect(()=>{
        const run = async() => {
            if (!processingBook) return;

            const addedBook = await addBook(processingBook)
            if(!addedBook)return;
            if(addedBook.in_library){

                pageCal(addedBook.book)
                setDidPaginate(true)
                router.replace("/bookPages")
            };

            if(!addedBook.in_library){
                const processedBook = await processBook(addedBook.book)
                setSelectedBook(processedBook)
                setBookProcessed(true)
            }

        }
    run()},[])
    
    const coverPage: Page = {
        text: "", // or optional caption
        index: 0,
        isCover: true,
        coverImage: processingBook?.cover_image_url ?? null
    };
    
    useEffect(() => { //create pages 
        if(didPaginate)return;
        const run = async ()=>{

        
        if (lines.length > 0 && pageHeight > 0 && linesPerPage > 0) {
            const newPages: Page[] = [];
            newPages.push(coverPage)
            let page_num = 1
            for (let i = 0; i < lines.length; i += linesPerPage) {
                const chunk = lines.slice(i, i + linesPerPage);
                const newText = chunk.map((l) => l.text).join("")
                const newPage:Page = {
                    text:newText,
                    index:page_num
                }
                newPages.push(newPage)
                page_num++;
                
                //newPages.push(chunk.map((l) => l.text).join("")); p 
            }

        setPages(newPages);
        setDidPaginate(true)
        //await embedPages(pages)
        try{
            await embedPages(newPages)
        }catch(e:any){
            console.error(e)
        }

        router.replace("/bookPages")
        }  
       
    };run()}, [lines, pageHeight, linesPerPage]);

    if(!processingBook)return null;

    return (
        <View style={{ flex: 1 }} onLayout={(e) => {
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
                    style={styles.pageText}
                    onTextLayout={(e) => {if (lines.length === 0) setLines(e.nativeEvent.lines);}}
                >
                    {selectedBook.book.text}
                </Text>
            </View>}

        </View>
    );
}

const styles = StyleSheet.create({
    pageText:{
        fontFamily: "EBGaramond-Regular",
        fontSize: 16,
        lineHeight: 26,
        letterSpacing: -0.2,
    }
})
