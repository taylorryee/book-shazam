import {create} from 'zustand'


export type BookFull = {
  id: number | null;
  gutenberg_id: number | null;
  title: string;
  authors: string[];
  formats: Record<string, string>;
  text_url: string | null;
  cover_image_url: string | null;
  process_level: string | null;

};

type BookStore = {
  books: BookFull[];
  selectedBook:BookFull | null;
  setBooks: (books: BookFull[]) => void;
  addBook: (book: BookFull) => void;
  clearBooks: () => void;
  setSelectedBook:(book:BookFull | null)=>void
};
// Create your Zustand store here

export const useBookStore = create<BookStore>((set) => ({
  books: [],
  selectedBook:null,

  setBooks: (books) => set({ books }),

  addBook: (book) =>
    set((state) => ({
      books: [...state.books, book],
    })),

  clearBooks: () => set({ books: [] }),

  setSelectedBook:(book)=>set({selectedBook:book}),


}));

