import { View, Text, Button, TextInput, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useState,useEffect } from "react";
import api from "../api"
import {useBookStore,BookFullText} from "../store"


export default function findBook() {
  const router = useRouter();
  const [title, setTitle] = useState<string | null> (null);
  const [author, setAuthor] = useState<string | null>(null);
  //const [books,setBooks] = useState<BookFull[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const books =useBookStore((state)=>state.books)
  const setBooks = useBookStore((state)=>state.setBooks)

  const getBooks = async (title:string | null,author:string|null): Promise<BookFullText[]> => {
    const response = await api.post<BookFullText[]>("/book",{title,author})
    setBooks(response.data)
    
    return response.data
  }
  
  useEffect(()=>{console.log(books)},[books]);

  const handleFind = async () => {
    try {
      setLoading(true);
      setError(null);
      await getBooks(title, author);
      router.push("/bookSelection");
    } catch (e) {
      console.error("Failed to fetch books:", e);
      setError("Could not find that book");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Finding books...</Text>
      </View>
    );
  }
  
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Find your book</Text>
      <TextInput
        placeholder="Book title"
        value={title ?? ""}
        onChangeText={setTitle}
        style={{
          width: "100%",
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          marginBottom: 12,
          backgroundColor: "#fff",
        }}
      />
      <TextInput
        placeholder="Book author"
        value={author ?? ""}
        onChangeText={setAuthor}
        style={{
          width: "100%",
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          marginBottom: 20,
          backgroundColor: "#fff",
        }}
      />
      
      {/* Go back button */}
      <Button title="Find" onPress={handleFind} />
      {error ? <Text style={{ marginTop: 12, color: "red" }}>{error}</Text> : null}
    </View>
  );
}
