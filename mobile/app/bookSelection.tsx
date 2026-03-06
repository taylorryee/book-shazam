import {useState,useEffect} from "react"
import {ScrollView,View,Button,Text,StyleSheet,Pressable,Modal,ActivityIndicator} from "react-native"
import {useBookStore,BookFull} from "../store"
import Book from "../components/book"
import api from "../api"
import { useRouter } from "expo-router";



export default function bookSelection(){
    const router= useRouter()
    const books = useBookStore((state)=>state.books)
    const [expandedBookID,setExpandedBookID]= useState<null | number>(null)
    const isExpanded = expandedBookID !=null
    const expandedBook = books.find((b)=>b.gutenberg_id==expandedBookID)
    const [loading,setLoading] = useState(false)

    const setSelectedBook = useBookStore((state) => state.setSelectedBook);


    const processBook = async (book:BookFull) => {
        const response = await api.post("/book/process",book)
        setSelectedBook(response.data)
    }

    const handleProcess = async (book:BookFull) => {
        try{
            setLoading(true)
            expandedBook && await processBook(expandedBook)
            router.push("/Shazam")
        }
        catch(e){
            console.log("error:",e)
        }
        finally{
            setLoading(false)
            setExpandedBookID(null)
        }


    }
    useEffect(()=>console.log(expandedBook),[expandedBook])

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