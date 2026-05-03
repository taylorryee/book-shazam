// import {useState,useEffect} from "react"
// import {ScrollView,View,Button,Text,StyleSheet,Pressable,Modal,ActivityIndicator} from "react-native"
// import {useBookStore,UserBook} from "../store"
// import Book from "../components/book"
// import {api} from "../api"
// import { useRouter } from "expo-router";

// export default function home(){
//     const setUserBooks = useBookStore((s)=>s.setUserBooks)
    
//     const getUserBooks = async () =>{
//         const response = await api.get("/user/user_books")
//         return response.data
//     }   

//     useEffect(()=>{
//         const run = async () =>{
//             const books = await getUserBooks()
//             setUserBooks(books
//             )
//         }
        
//         run()

//     },[])

//     return(

//     );
// }