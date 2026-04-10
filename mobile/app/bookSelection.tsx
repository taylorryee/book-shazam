import {useState,useEffect} from "react"
import {ScrollView,View,Button,Text,StyleSheet,Pressable,Modal,ActivityIndicator} from "react-native"
import {useBookStore,BookFullText,UserBook} from "../store"
import Book from "../components/book"
import {api} from "../api"
import { useRouter } from "expo-router";



export default function bookSelection(){
    const router= useRouter()
    const books = useBookStore((state)=>state.books)
    const [expandedBookID,setExpandedBookID]= useState<null | number>(null)
    const isExpanded = expandedBookID !=null
    const expandedBook = books.find((b)=>b.gutenberg_id==expandedBookID)
    const [loading,setLoading] = useState(false)

    const setSelectedBook = useBookStore((state) => state.setSelectedBook)
    const setBookPosition = useBookStore((state)=>state.setBookPosition)

    const selectedBook = useBookStore((state)=>state.selectedBook)


    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms)) //Promise syntax is Promise(resolve,reject => {code to run ... then either resolve() for success or reject() for failure}) In our case we simply run setTimeout which will not fail
    //so we can just do setTimeout then have it run resolve when it finishes to return the promise. We can now await this sleep function in processBook because it is a Promise that runs setTimeout.
    // Now we can use sleep in processBook using await sleep(1000) to actually pause the async function as it will await as long as the Promise is not resolved - which will happen when setTimeout finishes. 
    // If we just did await setTimeout(...) it would not wait, because setTimeout is non-blocking

    const addBook = async(book:BookFullText) => {
        try{
            const response = await api.post("/book/add",book)
            return response.data
        }catch(e:any){
            console.error(e)
        }
    }
    
    const processBook = async (book:UserBook):Promise<UserBook> => {
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


    const handleProcess = async (book:BookFullText) => {
        try{
            setLoading(true)
            const added_book = await addBook(book)
            const processed_user_book = await processBook(added_book) //process book 
            setSelectedBook(processed_user_book)
            router.push("/bookPages")
        }
        catch(e){
            console.log("error:",e)
        }
        finally{
            setLoading(false)
            setExpandedBookID(null)
            setBookPosition(null)
        }

    }

    useEffect(()=>{console.log(books)},[])

    if (loading && expandedBook) {
        return (
            <View style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              padding: 20,
            }}
          >
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 12 }}>Processing: {expandedBook.title}...</Text>
          </View>
        );
      }
    
    return(
        <>
        <ScrollView>
            <View style = {styles.grid}>
                {books.map((book)=>(
                    <Pressable key={book.gutenberg_id} onPress = {()=>setExpandedBookID(book.gutenberg_id)}>
                        <Book book = {book}/>
                    </Pressable>
                ))}
            
            </View>
        </ScrollView>
        
        <Modal visible={isExpanded} transparent={true}>
            <View style={styles.modalContainer}>
                {expandedBook && (
                    <View style={styles.modalContent}>
                        <Book book={expandedBook}/>
                        <View style={styles.buttons}>
                            <Button title="Select" onPress={()=>handleProcess(expandedBook)}/>
                            <Button title="Close" onPress={()=>setExpandedBookID(null)}/>
                        </View>
                    </View>
                )}
            </View>
        </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    grid:{
        flexDirection: "row",
        flexWrap: "wrap",
        gap:25,
    },
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",

    },

    modalContent: {
        gap:55,
        backgroundColor: "white",
        padding: 20,
        borderRadius: 10
    },
    buttons:{
        gap:10
    }
});
