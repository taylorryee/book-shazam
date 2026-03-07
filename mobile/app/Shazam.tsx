import {useState,useEffect} from "react"
import {View,Button,TextInput,StyleSheet} from "react-native"
import api from "../api"
import {useBookStore} from "../store"


export default function Shazam(){
    const [startText,setStartText] = useState("")
    const SelectedBook = useBookStore((state)=>state.selectedBook)
    if (!SelectedBook || !SelectedBook.id){
        return null
    }
    const bookID = SelectedBook.id
    const upload_text = async () =>{
        const response = api.post("/shazam/upload_text",{startText,bookID})
    }
    //Upload text is were we are - ne
    return(
        <View>
            <TextInput placeholder="Input sentence that you are on" value = {startText} onChangeText = {setStartText} style={styles.textInput}/>
            <Button title = "start reading" onPress = {()=>upload_text}/> 
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

