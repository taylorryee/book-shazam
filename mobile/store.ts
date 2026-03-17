import {create} from 'zustand'

type BookChunk = {
  chunk_index:number,
  text:string,
}

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

export type BookFullText = {
  id: number | null;
  gutenberg_id: number | null;
  title: string;
  authors: string[];
  formats: Record<string, string>;
  text_url: string | null;
  cover_image_url: string | null;
  process_level: string | null;
  text:string | null;
  chunks:null | BookChunk[]
}



export type Page = {
  lines:string[]
  index:number
}


type BookStore = {
  books: BookFullText[];
  selectedBook:BookFullText | null;
  bookPosition:number | null;
  pages:Page[];

  
  setBooks: (books: BookFullText[]) => void;
  addBook: (book: BookFullText) => void;
  clearBooks: () => void;
  setSelectedBook:(book:BookFullText | null)=>void
  setBookPosition:(position:number | null)=>void
  setPages:(pages:Page[])=>void

};

export const useBookStore = create<BookStore>((set) => ({
  books: [],
  selectedBook:null,
  bookPosition:null,
  bookText:null,
  pages:[],

  setBooks: (books) => set({ books }),

  addBook: (book) =>
    set((state) => ({
      books: [...state.books, book],
    })),

  clearBooks: () => set({ books: [] }),

  setSelectedBook:(book)=>set({selectedBook:book}),
  setBookPosition:(position)=>set({bookPosition:position}),
  setPages:(pages)=>set({pages:pages})



}));

