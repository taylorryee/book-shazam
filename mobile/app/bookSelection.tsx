import {useState,useEffect} from "react"
import {ScrollView,View,Button,Text,StyleSheet,FlatList} from "react-native"
import {useBookStore} from "../store"
import Book from "../components/book"



export default function bookSelection(){
    const books = useBookStore((state)=>state.books)
    useEffect(()=>{console.log(books)},[])
    return(
        <ScrollView>
        <View style = {styles.grid}>
            {books.map((book)=>(
                <View key={book.gutenberg_id}>
                    <Book book = {book}/>
                </View>
            ))}
        </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    grid:{
        flexDirection: "row",
        flexWrap: "wrap",
        gap:25,
    },
});