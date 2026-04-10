import {create} from 'zustand'

type BookChunk = {
  chunk_index:number,
  text:string,
}



export type BookFullText = {
  id: number | null;
  gutenberg_id: number;
  title: string;
  authors: string[];
  formats: Record<string, string>;
  text_url: string | null;
  cover_image_url: string | null;
  process_level: string | null;
  text:string | null;
  chunks:BookChunk[] | null;
  
}

export type UserBook={
  book:BookFullText;
  user_id:number;
  progress:number;
}

export type BookFull = BookFullText

export type Page = {
  lines:string[]
  index:number
}


type BookStore = {
  books: BookFullText[];
  selectedBook:UserBook | null;
  bookPosition:number | null;
  pages:Page[];
  currentPage:number
  userBooks:UserBook[];

  
  setBooks: (books: BookFullText[]) => void;
  addBook: (book: BookFullText) => void;
  clearBooks: () => void;
  setSelectedBook:(book:UserBook)=>void
  setBookPosition:(position:number | null)=>void
  setPages:(pages:Page[])=>void
  setCurrentPage:(pageNum:number)=>void
  setUserBooks:(books:UserBook[])=>void;

};

export const useBookStore = create<BookStore>((set) => ({
  books: [],
  selectedBook:null,
  bookPosition:null,
  bookText:null,
  pages:[],
  currentPage:0,
  userBooks:[],

  setBooks:(books)=>set({books:books}),
  addBook: (book) =>
    set((state) => ({
      books: [...state.books, book],
    })),

  clearBooks: () => set({ books: [] }),

  setSelectedBook:(book)=>set({selectedBook:book}),
  setBookPosition:(position)=>set({bookPosition:position}),
  setPages:(pages)=>set({pages:pages}),
  setCurrentPage:(pageNum)=>set({currentPage:pageNum}),
  setUserBooks:(books)=>set({userBooks:books})


}));
