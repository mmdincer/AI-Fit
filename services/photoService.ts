import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage anahtarları
const BODY_IMAGE_KEY = 'body_image';
const GARMENT_IMAGE_KEY = 'garment_image';
const RESULT_IMAGE_KEY = 'result_image';
const GARMENT_DESCRIPTION_KEY = 'garment_description';
const CATEGORY_KEY = 'category';

// Vücut resmini kaydet
export const saveBodyImage = async (uri: string | null): Promise<void> => {
  try {
    if (uri) {
      await AsyncStorage.setItem(BODY_IMAGE_KEY, uri);
    } else {
      await AsyncStorage.removeItem(BODY_IMAGE_KEY);
    }
    console.log('Vücut resmi kaydedildi');
  } catch (error) {
    console.error('Vücut resmi kaydedilemedi:', error);
    throw error;
  }
};

// Kıyafet resmini kaydet
export const saveGarmentImage = async (uri: string | null): Promise<void> => {
  try {
    if (uri) {
      await AsyncStorage.setItem(GARMENT_IMAGE_KEY, uri);
    } else {
      await AsyncStorage.removeItem(GARMENT_IMAGE_KEY);
    }
    console.log('Kıyafet resmi kaydedildi');
  } catch (error) {
    console.error('Kıyafet resmi kaydedilemedi:', error);
    throw error;
  }
};

// Sonuç resmini kaydet
export const saveResultImage = async (uri: string | null): Promise<void> => {
  try {
    if (uri) {
      await AsyncStorage.setItem(RESULT_IMAGE_KEY, uri);
    } else {
      await AsyncStorage.removeItem(RESULT_IMAGE_KEY);
    }
    console.log('Sonuç resmi kaydedildi');
  } catch (error) {
    console.error('Sonuç resmi kaydedilemedi:', error);
    throw error;
  }
};

// Kıyafet açıklamasını kaydet
export const saveGarmentDescription = async (description: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(GARMENT_DESCRIPTION_KEY, description);
    console.log('Kıyafet açıklaması kaydedildi');
  } catch (error) {
    console.error('Kıyafet açıklaması kaydedilemedi:', error);
    throw error;
  }
};

// Kategoriyi kaydet
export const saveCategory = async (category: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(CATEGORY_KEY, category);
    console.log('Kategori kaydedildi');
  } catch (error) {
    console.error('Kategori kaydedilemedi:', error);
    throw error;
  }
};

// Vücut resmini yükle
export const loadBodyImage = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(BODY_IMAGE_KEY);
  } catch (error) {
    console.error('Vücut resmi yüklenemedi:', error);
    return null;
  }
};

// Kıyafet resmini yükle
export const loadGarmentImage = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(GARMENT_IMAGE_KEY);
  } catch (error) {
    console.error('Kıyafet resmi yüklenemedi:', error);
    return null;
  }
};

// Sonuç resmini yükle
export const loadResultImage = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(RESULT_IMAGE_KEY);
  } catch (error) {
    console.error('Sonuç resmi yüklenemedi:', error);
    return null;
  }
};

// Kıyafet açıklamasını yükle
export const loadGarmentDescription = async (): Promise<string> => {
  try {
    const description = await AsyncStorage.getItem(GARMENT_DESCRIPTION_KEY);
    return description || '';
  } catch (error) {
    console.error('Kıyafet açıklaması yüklenemedi:', error);
    return '';
  }
};

// Kategoriyi yükle
export const loadCategory = async (): Promise<string> => {
  try {
    const category = await AsyncStorage.getItem(CATEGORY_KEY);
    return category || '';
  } catch (error) {
    console.error('Kategori yüklenemedi:', error);
    return '';
  }
};

// Tüm fotoğraf verilerini yükle
export const loadAllPhotoData = async (): Promise<{
  bodyImage: string | null;
  garmentImage: string | null;
  resultImage: string | null;
  garmentDescription: string;
  category: string;
}> => {
  try {
    const [bodyImage, garmentImage, resultImage, garmentDescription, category] = await Promise.all([
      loadBodyImage(),
      loadGarmentImage(),
      loadResultImage(),
      loadGarmentDescription(),
      loadCategory()
    ]);
    
    return {
      bodyImage,
      garmentImage,
      resultImage,
      garmentDescription,
      category
    };
  } catch (error) {
    console.error('Fotoğraf verileri yüklenemedi:', error);
    return {
      bodyImage: null,
      garmentImage: null,
      resultImage: null,
      garmentDescription: '',
      category: ''
    };
  }
};

// Tüm fotoğraf verilerini temizle
export const clearAllPhotoData = async (): Promise<void> => {
  try {
    await Promise.all([
      AsyncStorage.removeItem(BODY_IMAGE_KEY),
      AsyncStorage.removeItem(GARMENT_IMAGE_KEY),
      AsyncStorage.removeItem(RESULT_IMAGE_KEY),
      AsyncStorage.removeItem(GARMENT_DESCRIPTION_KEY),
      AsyncStorage.removeItem(CATEGORY_KEY)
    ]);
    
    console.log('Tüm fotoğraf verileri temizlendi');
  } catch (error) {
    console.error('Fotoğraf verileri temizlenemedi:', error);
    throw error;
  }
}; 