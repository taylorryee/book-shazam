import {useState,useEffect} from "react"
import {ScrollView,View,Button,Text,StyleSheet,Pressable,Modal} from "react-native"
import {useBookStore} from "../store"
import Book from "../components/book"
import { BlurView } from "expo-blur";



export default function bookSelection(){
    const books = useBookStore((state)=>state.books)
    const [expandedBookID,setExpandedBookID]= useState<null | number>(null)
    const isExpanded = expandedBookID !=null
    const expandedBook = books.find((b)=>b.gutenberg_id==expandedBookID)
    //useEffect(()=>{console.log(books)},[])
    useEffect(()=>console.log(expandedBook),[expandedBook])
    
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
                    <Pressable onPress={()=>setExpandedBookID(null)}>
                        <Text>Close</Text>
                    </Pressable>
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
        backgroundColor: "rgba(0,0,0,0.4)" // dark overlay
    },

    modalContent: {
        backgroundColor: "white",
        padding: 20,
        borderRadius: 10
    },
});