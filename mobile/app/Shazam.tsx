import {useState,useEffect,useRef} from "react"
import {View,Button,TextInput,StyleSheet,Text,ScrollView,TextLayoutLine} from "react-native"
import api from "../api"
import {useBookStore,Page} from "../store"



export default function Shazam(){
    const [startText,setStartText] = useState("")
    const SelectedBook = useBookStore((state)=>state.selectedBook)
    const globalPages = useBookStore((state)=>state.pages)
    const setGlobalPages = useBookStore((state)=>state.setPages)

    
    if (!SelectedBook || !SelectedBook.id || !SelectedBook.text || !SelectedBook.chunks){
        return null
    }
    const [pageHeight, setPageHeight] = useState(0) //page height
    const linesPerPage = Math.floor(pageHeight / 26)//how many lines fit 
    
    const linesRef = useRef<TextLayoutLine[]>([])

    const curLineCount = useRef(0)
    const curPageLines = useRef<string[]>([])
    const pageIndex = useRef(0)
    const pages = useRef<Page[]>([])
    
    return(
        <>
        <View style={{padding:10}} onLayout={(e)=>{setPageHeight(e.nativeEvent.layout.height)}}> 
            {SelectedBook.chunks.map(chunk => 
                <Text key = {chunk.chunk_index} style={{fontSize:18, lineHeight:26}} onTextLayout={(e)=>{
                    const lines = e.nativeEvent.lines
                    linesRef.current.push(...lines)
                }}/>
            )}
        </View>
        {linesRef.current.forEach(line=>{
            if(curLineCount.current<linesPerPage){
                curLineCount.current +=1
                curPageLines.current.push(line.text)
            }
            else{
                let newPage:Page = {
                    lines:curPageLines.current,
                    index:pageIndex.current

                }
                pages.current.push(newPage)
                pageIndex.current+=1
                curLineCount.current = 0
                curPageLines.current = []

            }
        })}

        {setGlobalPages(pages.current)}
        </>
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

