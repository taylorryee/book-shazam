import {useState,useEffect} from "react"
import {ScrollView,View,Button,Text,StyleSheet,Pressable,Modal,ActivityIndicator,TextLayoutLine,FlatList,useWindowDimensions} from "react-native"
import {useBookStore,BookFullText,UserBook,Page} from "../store"
import Book from "../components/book"
import {api} from "../api"
import { useRouter } from "expo-router";
import HiddenTextMeasure from "../components/HiddenTextMeasure"


export default function bookSelection(){
    const router= useRouter()
    const books = useBookStore((state)=>state.books)
    const [expandedBookID,setExpandedBookID]= useState<null | number>(null)
    const isExpanded = expandedBookID !=null
    const expandedBook = books.find((b)=>b.gutenberg_id==expandedBookID)



    const setProcessingBook = useBookStore((state)=>state.setProcessingBook)


    const handleProcess = async (book:BookFullText) => {
        try{

            if(expandedBook)setProcessingBook(expandedBook)
            router.push("/processing")

        }
        catch(e){
            console.log("error:",e)
        }
        finally{
            setExpandedBookID(null)
        }

    }
    const { width } = useWindowDimensions();

    const ITEM_WIDTH = 120; // target width of each book card
    const SPACING = 16;

    const numColumns = Math.floor(width / (ITEM_WIDTH + SPACING));
    
    return(
        <View style = {{flex:1}}>
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
        

        </View>
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
    },
    loadingOverlay:{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    }
});
