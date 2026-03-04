import {View,Text} from 'react-native'
import {BookFull,BookChunk} from '../store'
import {Image} from 'expo-image'

type BookProps = {book:BookFull}
export default function Book({book}:BookProps){
    
    return(
        <View>
            <Image 
                source={{ uri: book.cover_image_url ?? "https://picsum.photos/300/400" }}
                style={{ width: 120, height: 180 }}
            />
            <Text>{book.title},{book.authors}</Text>
        </View>
    );
}