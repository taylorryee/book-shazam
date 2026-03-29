import { View, Text, StyleSheet,Pressable } from "react-native";
import { BookFullText } from "../store";
import { Image } from "expo-image";

const COVER_WIDTH = 120;
const COVER_HEIGHT = 180;
const CONTAINER_HEIGHT = 200

type BookProps = { book: BookFullText };

export default function Book({ book }: BookProps) {
  return (
    <View style={styles.container}>
      <Image
        source={{ uri: book.cover_image_url ?? "https://picsum.photos/300/400" }}
        style={styles.cover}
      />
      <Text style={styles.title}>
        {book.title},{book.authors}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: COVER_WIDTH,
    height:CONTAINER_HEIGHT,
  },
  cover: {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
  },
  title: {
    width: "100%",
    height:"100%",
    marginTop: 6,
    flexWrap: "wrap",
  },
});
