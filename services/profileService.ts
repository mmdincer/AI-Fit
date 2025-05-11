import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProfileData, SavedOutfit } from '@/store/profileStore';

// AsyncStorage anahtarları
const PROFILE_STORAGE_KEY = 'user_profile';
const PROFILES_CACHE_KEY = 'profiles_cache';

// Profil verilerini kaydetme
export const saveProfileData = async (profileData: ProfileData): Promise<void> => {
  try {
    await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profileData));
    console.log('Profil verileri kaydedildi');
  } catch (error) {
    console.error('Profil verileri kaydedilemedi:', error);
    throw error;
  }
};

// Profil verilerini yükleme
export const loadProfileData = async (): Promise<ProfileData | null> => {
  try {
    const profileJSON = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
    return profileJSON ? JSON.parse(profileJSON) : null;
  } catch (error) {
    console.error('Profil verileri yüklenemedi:', error);
    return null;
  }
};

// Profil önbelleğini kaydetme
export const saveProfilesCache = async (profilesCache: Record<string, ProfileData>): Promise<void> => {
  try {
    await AsyncStorage.setItem(PROFILES_CACHE_KEY, JSON.stringify(profilesCache));
    console.log('Profil önbelleği kaydedildi');
  } catch (error) {
    console.error('Profil önbelleği kaydedilemedi:', error);
    throw error;
  }
};

// Profil önbelleğini yükleme
export const loadProfilesCache = async (): Promise<Record<string, ProfileData>> => {
  try {
    const cacheJSON = await AsyncStorage.getItem(PROFILES_CACHE_KEY);
    return cacheJSON ? JSON.parse(cacheJSON) : {};
  } catch (error) {
    console.error('Profil önbelleği yüklenemedi:', error);
    return {};
  }
};

// Belirli bir kıyafeti kaydetme
export const saveOutfit = async (outfit: SavedOutfit): Promise<void> => {
  try {
    const profileData = await loadProfileData();
    
    if (!profileData) {
      throw new Error('Profil verileri bulunamadı');
    }
    
    const existingOutfitIndex = profileData.savedOutfits.findIndex(o => o.id === outfit.id);
    
    if (existingOutfitIndex !== -1) {
      // Kıyafet zaten varsa güncelle
      profileData.savedOutfits[existingOutfitIndex] = outfit;
    } else {
      // Yeni kıyafet ekle
      profileData.savedOutfits.push(outfit);
    }
    
    // Public kıyafet sayısını güncelle
    profileData.publicOutfitCount = profileData.savedOutfits.filter(o => o.isPublic).length;
    
    // Profili kaydet
    await saveProfileData(profileData);
  } catch (error) {
    console.error('Kıyafet kaydedilemedi:', error);
    throw error;
  }
};

// Belirli bir kıyafeti silme
export const deleteOutfit = async (outfitId: string): Promise<void> => {
  try {
    const profileData = await loadProfileData();
    
    if (!profileData) {
      throw new Error('Profil verileri bulunamadı');
    }
    
    profileData.savedOutfits = profileData.savedOutfits.filter(o => o.id !== outfitId);
    profileData.publicOutfitCount = profileData.savedOutfits.filter(o => o.isPublic).length;
    
    // Profili kaydet
    await saveProfileData(profileData);
  } catch (error) {
    console.error('Kıyafet silinemedi:', error);
    throw error;
  }
}; 