import {create} from 'zustand'

export type BookChunk = {
  chunk_index: number;
  text: string;
  token_count: number;
  embedding: number[] | null;
};

export type BookFull = {
  id: number | null;
  gutenberg_id: number | null;
  title: string;
  authors: string[];
  formats: Record<string, string>;
  text_url: string | null;
  cover_image_url: string | null;
  process_level: string | null;
  chunks: BookChunk[] | null;
};

type BookStore = {
  books: BookFull[];
  setBooks: (books: BookFull[]) => void;
  addBook: (book: BookFull) => void;
  clearBooks: () => void;
};
// Create your Zustand store here

export const useBookStore = create<BookStore>((set) => ({
  books: [],

  setBooks: (books) => set({ books }),

  addBook: (book) =>
    set((state) => ({
      books: [...state.books, book],
    })),

  clearBooks: () => set({ books: [] }),

}));