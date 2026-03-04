import {useState,useEffect} from "react"
import {ScrollView,View,Button,Text} from "react-native"
import {useBookStore} from "../store"
import Book from "../components/book"



export default function bookSelection(){
    const books = useBookStore((state)=>state.books)
    useEffect(()=>{console.log(books)},[])
    return(
        <ScrollView>
        <View>
            {books.map((book)=>(
                <Book key ={book.gutenberg_id} book = {book}/>
            ))}
        </View>
        </ScrollView>
    );
}