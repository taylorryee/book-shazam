import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Button,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { api } from "../api";
import { useAuthStore } from "../authStore";
import Book from "../components/book";
import { BookFullText, Page, useBookStore, UserBook } from "../store";

type BackendPage = {
  index: number;
  text: string;
};

export default function FindBook() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [selectedLibraryBookID, setSelectedLibraryBookID] = useState<null | number>(null);
  const [openingBook, setOpeningBook] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userBooks = useBookStore((state) => state.userBooks);
  const setBooks = useBookStore((state) => state.setBooks);
  const setUserBooks = useBookStore((state) => state.setUserBooks);
  const setSelectedBook = useBookStore((state) => state.setSelectedBook);
  const setBookPosition = useBookStore((state) => state.setBookPosition);
  const setPages = useBookStore((state) => state.setPages);
  const logout = useAuthStore((state) => state.logout);

  const selectedLibraryBook = userBooks.find(
    (userBook) => userBook.book.id === selectedLibraryBookID
  );

  const getUserBooks = useCallback(async () => {
    const response = await api.get<UserBook[]>("/user/user_books");
    setUserBooks(response.data);
  }, [setUserBooks]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadLibrary = async () => {
        try {
          if (isActive) setLibraryLoading(true);
          setError(null);
          await getUserBooks();
        } catch (e) {
          console.error("Failed to get user books", e);
          if (isActive) setError("Could not load your library");
        } finally {
          if (isActive) setLibraryLoading(false);
        }
      };

      loadLibrary();

      return () => {
        isActive = false;
      };
    }, [getUserBooks])
  );

  const handleFind = async () => {
    if (!query.trim()) return;

    try {
      setSearchLoading(true);
      setError(null);

      const response = await api.post<BookFullText[]>("/book/", {
        title: query.trim(),
        author: null,
      });

      setBooks(response.data);
      router.push("/bookSelection");
    } catch (e) {
      console.error("Failed to fetch books:", e);
      setError("Could not find that book");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleOpenLibraryBook = async (book: UserBook) => {
    try {
      setOpeningBook(true);
      setError(null);

      if (!book.book.id) {
        setError("Could not open that book");
        return;
      }

      const pagesResponse = await api.get<BackendPage[]>("/user/pages", {
        params: { book_id: book.book.id },
      });
      const sortedPages = [...pagesResponse.data].sort((a, b) => a.index - b.index);
      const loadedPages: Page[] = sortedPages.map((page) => ({
        text: page.text,
        index: page.index,
        isCover: page.index === 0,
        coverImage: page.index === 0 ? book.book.cover_image_url : null,
      }));

      const pages =
        loadedPages[0]?.index === 0
          ? loadedPages
          : [
              {
                text: "",
                index: 0,
                isCover: true,
                coverImage: book.book.cover_image_url,
              },
              ...loadedPages,
            ];

      setSelectedBook(book);
      setPages(pages);
      setBookPosition(null);

      router.push("/bookPages");
    } catch (e) {
      console.error("Failed to open book", e);
      setError("Could not open that book");
    } finally {
      setOpeningBook(false);
      setSelectedLibraryBookID(null);
    }
  };

  const handleSignOut = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <View style={styles.screen}>
      <Pressable style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>

      <View style={styles.searchSection}>
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Find new book</Text>
        </View>

        <View style={styles.searchBox}>
          <TextInput
            placeholder="Search by title or author"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={handleFind}
            style={styles.searchInput}
          />
          <Button
            title={searchLoading ? "Searching..." : "Search"}
            onPress={handleFind}
            disabled={searchLoading || !query.trim()}
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <View style={styles.librarySection}>
        <View style={styles.libraryHeader}>
          <Text style={styles.heading}>Your library</Text>
          {libraryLoading ? <ActivityIndicator /> : null}
        </View>

        {userBooks.length === 0 && !libraryLoading ? (
          <View style={styles.emptyLibrary}>
            <Text style={styles.emptyText}>No books in your library yet.</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.libraryShelf}
          >
            {userBooks.map((userBook) => (
              <Pressable
                key={userBook.book.id}
                onPress={() => setSelectedLibraryBookID(userBook.book.id)}
                style={styles.bookPressable}
              >
                <Book book={userBook.book} />
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      <Modal visible={selectedLibraryBookID !== null} transparent>
        <View style={styles.modalContainer}>
          {selectedLibraryBook ? (
            <View style={styles.modalContent}>
              <Book book={selectedLibraryBook.book} />

              {openingBook ? <ActivityIndicator /> : null}

              <View style={styles.modalButtons}>
                <Button
                  title={openingBook ? "Opening..." : "Open"}
                  onPress={() => handleOpenLibraryBook(selectedLibraryBook)}
                  disabled={openingBook}
                />
                <Button
                  title="Close"
                  onPress={() => setSelectedLibraryBookID(null)}
                  disabled={openingBook}
                />
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#faf7f0",
    padding: 20,
  },
  searchSection: {
    flex: 1,
    justifyContent: "center",
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  signOutButton: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
    borderWidth: 1,
    borderColor: "#bbb",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#fff",
  },
  signOutText: {
    fontSize: 12,
    color: "#333",
  },
  heading: {
    fontSize: 24,
    fontWeight: "600",
  },
  searchBox: {
    gap: 12,
  },
  searchInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  errorText: {
    color: "red",
  },
  librarySection: {
    flex: 1,
    gap: 12,
  },
  libraryHeader: {
    minHeight: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  libraryShelf: {
    gap: 18,
    paddingVertical: 8,
    paddingRight: 20,
  },
  bookPressable: {
    width: 120,
  },
  emptyLibrary: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#666",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    padding: 20,
  },
  modalContent: {
    gap: 24,
    backgroundColor: "white",
    padding: 20,
    borderRadius: 8,
  },
  modalButtons: {
    gap: 10,
  },
});
