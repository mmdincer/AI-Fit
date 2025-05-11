import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

// AsyncStorage anahtarları
const GENERATION_HISTORY_KEY = 'generation_history';
const SAVED_MODELS_KEY = 'saved_models';

export interface GeneratedImage {
  id: string;
  uri: string;
  thumbnail?: string;
  title: string;
  description?: string;
  createdAt: number;
  bodyImageUri?: string;
  garmentImageUri?: string;
  prompt?: string;
  modelInfo?: SavedModel;
}

export interface SavedModel {
  id: string;
  name: string;
  description?: string;
  settings: any; // Model özel ayarları
  createdAt: number;
}

// Oluşturulan resimleri kaydetme
export const saveGeneratedImage = async (image: GeneratedImage): Promise<void> => {
  try {
    // Mevcut geçmişi yükle
    const history = await loadGenerationHistory();
    
    // Aynı ID ile kayıt var mı kontrol et
    const existingIndex = history.findIndex(item => item.id === image.id);
    
    if (existingIndex !== -1) {
      // Varsa güncelle
      history[existingIndex] = image;
    } else {
      // Yoksa yeni ekle
      history.unshift(image); // En başa ekle (en yeni)
    }
    
    // Geçmişi kaydet
    await AsyncStorage.setItem(GENERATION_HISTORY_KEY, JSON.stringify(history));
    console.log('Oluşturulan resim kaydedildi');
  } catch (error) {
    console.error('Oluşturulan resim kaydedilemedi:', error);
    throw error;
  }
};

// Oluşturulan resimlerin geçmişini yükleme
export const loadGenerationHistory = async (): Promise<GeneratedImage[]> => {
  try {
    const historyJSON = await AsyncStorage.getItem(GENERATION_HISTORY_KEY);
    return historyJSON ? JSON.parse(historyJSON) : [];
  } catch (error) {
    console.error('Resim geçmişi yüklenemedi:', error);
    return [];
  }
};

// Bir resmi silme
export const deleteGeneratedImage = async (id: string, uri: string): Promise<void> => {
  try {
    // Dosya sisteminden resmini sil
    try {
      if (uri && uri.startsWith(FileSystem.documentDirectory || '')) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      }
    } catch (fileError) {
      console.warn('Dosya silinirken hata:', fileError);
      // Dosya silinememesi durumunda devam et
    }
    
    // Önbelleği güncelle
    const history = await loadGenerationHistory();
    const updatedHistory = history.filter(item => item.id !== id);
    
    // Güncellenmiş geçmişi kaydet
    await AsyncStorage.setItem(GENERATION_HISTORY_KEY, JSON.stringify(updatedHistory));
    console.log('Resim silindi');
  } catch (error) {
    console.error('Resim silinemedi:', error);
    throw error;
  }
};

// Kaydedilmiş modelleri kaydetme
export const saveModel = async (model: SavedModel): Promise<void> => {
  try {
    // Mevcut modelleri yükle
    const models = await loadSavedModels();
    
    // Aynı ID ile model var mı kontrol et
    const existingIndex = models.findIndex(item => item.id === model.id);
    
    if (existingIndex !== -1) {
      // Varsa güncelle
      models[existingIndex] = model;
    } else {
      // Yoksa yeni ekle
      models.push(model);
    }
    
    // Modelleri kaydet
    await AsyncStorage.setItem(SAVED_MODELS_KEY, JSON.stringify(models));
    console.log('Model kaydedildi');
  } catch (error) {
    console.error('Model kaydedilemedi:', error);
    throw error;
  }
};

// Kaydedilmiş modelleri yükleme
export const loadSavedModels = async (): Promise<SavedModel[]> => {
  try {
    const modelsJSON = await AsyncStorage.getItem(SAVED_MODELS_KEY);
    return modelsJSON ? JSON.parse(modelsJSON) : [];
  } catch (error) {
    console.error('Modeller yüklenemedi:', error);
    return [];
  }
};

// Bir modeli silme
export const deleteModel = async (id: string): Promise<void> => {
  try {
    // Modelleri yükle
    const models = await loadSavedModels();
    
    // ID'ye göre filtrele
    const updatedModels = models.filter(model => model.id !== id);
    
    // Güncellenmiş modelleri kaydet
    await AsyncStorage.setItem(SAVED_MODELS_KEY, JSON.stringify(updatedModels));
    console.log('Model silindi');
  } catch (error) {
    console.error('Model silinemedi:', error);
    throw error;
  }
}; 