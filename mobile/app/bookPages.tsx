import {useState,useEffect} from "react"
import {View,Text} from "react-native"
import api from "../api"

type BookChunk = {
    text:string,
    chunk_index:number
}

export default function bookPages(){
    const [book,setBook] = useState<null | BookChunk[]>(null)
    
    const getBookChunks = async () => {
        try{
            const response = await api.get()
        }
        catch{

        }
 
    }
    

    useEffect(()=>{
        async function loadMore(){

        }
    },[])
    
    return(
        <View>

        </View>
    );
}