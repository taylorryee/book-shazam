import {useState,useEffect} from "react"
import {View,Button,TextInput,StyleSheet,Text,ScrollView} from "react-native"
import api from "../api"
import {useBookStore} from "../store"


export default function Shazam(){
    const [startText,setStartText] = useState("")
    const SelectedBook = useBookStore((state)=>state.selectedBook)
    const setBookPosition = useBookStore((state)=>state.setBookPosition)
    const BookPosition = useBookStore((state)=>state.bookPosition)
    
    if (!SelectedBook || !SelectedBook.id || !SelectedBook.text || !SelectedBook.chunks){
        return null
    }
    const bookID = SelectedBook.id

    const to_page = async () =>{
        const response = await api.post("/shazam/start_text", SelectedBook, {params: { text: startText },});
        setBookPosition(response.data)

    }
    
    return(
        <ScrollView>
            {SelectedBook.chunks.map(chunk => 
                <Text key = {chunk.chunk_index}>
                    {chunk.text}
                    {"\n\n"}
                </Text>
            )}
        </ScrollView>
    );
    // return(
    //     <ScrollView>
    //         <Text>
    //             {SelectedBook.text}
    //         </Text>
    //     </ScrollView>
    // );
}


const styles = StyleSheet.create({
    textInput:{
         width: "100%",
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          marginBottom: 12,
          backgroundColor: "#fff",
    }
})

