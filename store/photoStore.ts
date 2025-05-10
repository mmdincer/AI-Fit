import { create } from 'zustand';

interface PhotoState {
  bodyImage: string | null;
  garmentImage: string | null;
  resultImage: string | null;
  garmentDescription: string;
  category: string;
  setBodyImage: (uri: string | null) => void;
  setGarmentImage: (uri: string | null) => void;
  setResultImage: (uri: string | null) => void;
  setGarmentDescription: (description: string) => void;
  setCategory: (category: string) => void;
  clearImages: () => void;
}

export const photoStore = create<PhotoState>((set) => ({
  bodyImage: null,
  garmentImage: null,
  resultImage: null,
  garmentDescription: '',
  category: '',
  setBodyImage: (uri) => set({ bodyImage: uri }),
  setGarmentImage: (uri) => set({ garmentImage: uri }),
  setResultImage: (uri) => set({ resultImage: uri }),
  setGarmentDescription: (description) => set({ garmentDescription: description }),
  setCategory: (category) => set({ category }),
  clearImages: () => set({ 
    bodyImage: null, 
    garmentImage: null, 
    resultImage: null, 
    garmentDescription: '', 
    category: '' 
  }),
}));