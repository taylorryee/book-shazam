import {useState,useEffect} from "react"
import {View,Button,TextInput,StyleSheet,Text,ScrollView} from "react-native"
import api from "../api"
import {useBookStore} from "../store"


export default function Shazam(){
    const [startText,setStartText] = useState("")
    const SelectedBook = useBookStore((state)=>state.selectedBook)
    const setBookPosition = useBookStore((state)=>state.setBookPosition)
    const BookPosition = useBookStore((state)=>state.bookPosition)
    
    if (!SelectedBook || !SelectedBook.id){
        return null
    }
    const bookID = SelectedBook.id
    
    const upload_text = async () =>{
        const response = await api.post("/shazam/start_text", SelectedBook, {params: { text: startText },});
        setBookPosition(response.data)

    }

    useEffect(()=>console.log(BookPosition),[BookPosition])

    if(BookPosition){
        return(
            <ScrollView>
            <View>
                <Text>

                    {SelectedBook.text}
                </Text>

            </View>
            </ScrollView>
        );
    }
    return(
        <View>
            <TextInput placeholder="Input sentence that you are on" value = {startText} onChangeText = {setStartText} style={styles.textInput}/>
            <Button title = "start reading" onPress = {upload_text}/> 
        </View>
    );
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

