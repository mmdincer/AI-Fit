import { create } from 'zustand';
import {
  saveBodyImage,
  saveGarmentImage,
  saveResultImage,
  saveGarmentDescription,
  saveCategory,
  loadAllPhotoData,
  clearAllPhotoData
} from '@/services/photoService';

interface PhotoState {
  bodyImage: string | null;
  garmentImage: string | null;
  resultImage: string | null;
  garmentDescription: string;
  category: string;
  isLoading: boolean;
  setBodyImage: (uri: string | null) => void;
  setGarmentImage: (uri: string | null) => void;
  setResultImage: (uri: string | null) => void;
  setGarmentDescription: (description: string) => void;
  setCategory: (category: string) => void;
  clearImages: () => void;
  loadPhotoData: () => Promise<void>;
}

export const photoStore = create<PhotoState>((set) => ({
  bodyImage: null,
  garmentImage: null,
  resultImage: null,
  garmentDescription: '',
  category: '',
  isLoading: false,
  
  // Verileri yükle
  loadPhotoData: async () => {
    try {
      set({ isLoading: true });
      const data = await loadAllPhotoData();
      set({ 
        ...data,
        isLoading: false
      });
    } catch (error) {
      console.error('Fotoğraf verileri yüklenemedi:', error);
      set({ isLoading: false });
    }
  },
  
  // Vücut resmini ayarla
  setBodyImage: (uri) => {
    set({ bodyImage: uri });
    // AsyncStorage'a kaydet
    saveBodyImage(uri).catch(error => {
      console.error('Vücut resmi kaydedilemedi:', error);
    });
  },
  
  // Kıyafet resmini ayarla
  setGarmentImage: (uri) => {
    set({ garmentImage: uri });
    // AsyncStorage'a kaydet
    saveGarmentImage(uri).catch(error => {
      console.error('Kıyafet resmi kaydedilemedi:', error);
    });
  },
  
  // Sonuç resmini ayarla
  setResultImage: (uri) => {
    set({ resultImage: uri });
    // AsyncStorage'a kaydet
    saveResultImage(uri).catch(error => {
      console.error('Sonuç resmi kaydedilemedi:', error);
    });
  },
  
  // Kıyafet açıklamasını ayarla
  setGarmentDescription: (description) => {
    set({ garmentDescription: description });
    // AsyncStorage'a kaydet
    saveGarmentDescription(description).catch(error => {
      console.error('Kıyafet açıklaması kaydedilemedi:', error);
    });
  },
  
  // Kategoriyi ayarla
  setCategory: (category) => {
    set({ category });
    // AsyncStorage'a kaydet
    saveCategory(category).catch(error => {
      console.error('Kategori kaydedilemedi:', error);
    });
  },
  
  // Tüm resimleri temizle
  clearImages: () => {
    set({ 
      bodyImage: null, 
      garmentImage: null, 
      resultImage: null, 
      garmentDescription: '', 
      category: '' 
    });
    
    // AsyncStorage'dan temizle
    clearAllPhotoData().catch(error => {
      console.error('Fotoğraf verileri temizlenemedi:', error);
    });
  },
}));