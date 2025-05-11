import { create } from 'zustand';
import { loadProfileData, saveProfileData, loadProfilesCache, saveProfilesCache } from '@/services/profileService';

export interface SavedOutfit {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
  createdAt: number;
  isPublic: boolean;
  sharedWith?: string[]; // Paylaşıldığı kullanıcı ID'leri
}

export interface ProfileData {
  userId: string;
  displayName: string;
  bio: string;
  profilePicture: string | null;
  savedOutfits: SavedOutfit[];
  publicOutfitCount: number;
  receivedOutfits?: SavedOutfit[]; // Başkalarından alınan kıyafetler
}

interface ProfileState {
  myProfile: ProfileData | null;
  profilesCache: Record<string, ProfileData>; // userId -> profile data
  isLoading: boolean;
  
  // Profil işlemleri
  setMyProfile: (profile: ProfileData) => void;
  updateMyProfile: (updates: Partial<ProfileData>) => void;
  loadMyProfile: () => Promise<void>;
  loadProfilesCache: () => Promise<void>;
  
  // Kıyafet işlemleri
  addOutfit: (outfit: SavedOutfit) => void;
  removeOutfit: (outfitId: string) => void;
  updateOutfit: (outfitId: string, updates: Partial<SavedOutfit>) => void;
  toggleOutfitVisibility: (outfitId: string) => void;
  
  // Diğer profilleri yönetme
  cacheProfile: (userId: string, profile: ProfileData) => void;
  getCachedProfile: (userId: string) => ProfileData | undefined;
  clearCachedProfile: (userId: string) => void;
  
  // Kıyafet paylaşım işlemleri
  shareOutfitWithFriend: (outfitId: string, friendId: string) => void;
  addReceivedOutfit: (outfit: SavedOutfit) => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  myProfile: null,
  profilesCache: {},
  isLoading: false,
  
  // Profil yükleme işlemi
  loadMyProfile: async () => {
    try {
      set({ isLoading: true });
      const profile = await loadProfileData();
      set({ myProfile: profile });
    } catch (error) {
      console.error('Profil yüklenirken hata oluştu:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  
  // Profil önbelleğini yükleme
  loadProfilesCache: async () => {
    try {
      const cache = await loadProfilesCache();
      set({ profilesCache: cache });
    } catch (error) {
      console.error('Profil önbelleği yüklenirken hata oluştu:', error);
    }
  },
  
  // Profil işlemleri
  setMyProfile: (profile) => {
    set({ myProfile: profile });
    // AsyncStorage'a kaydet
    saveProfileData(profile).catch(error => {
      console.error('Profil kaydedilirken hata oluştu:', error);
    });
  },
  
  updateMyProfile: (updates) => set((state) => {
    if (!state.myProfile) return state;
    
    const updatedProfile = {
      ...state.myProfile,
      ...updates
    };
    
    // AsyncStorage'a kaydet
    saveProfileData(updatedProfile).catch(error => {
      console.error('Profil güncellenirken hata oluştu:', error);
    });
    
    return {
      myProfile: updatedProfile
    };
  }),
  
  // Kıyafet işlemleri
  addOutfit: (outfit) => set((state) => {
    if (!state.myProfile) return state;
    
    const newOutfits = [...state.myProfile.savedOutfits, outfit];
    const publicOutfitCount = newOutfits.filter(o => o.isPublic).length;
    
    const updatedProfile = {
      ...state.myProfile,
      savedOutfits: newOutfits,
      publicOutfitCount
    };
    
    // AsyncStorage'a kaydet
    saveProfileData(updatedProfile).catch(error => {
      console.error('Kıyafet eklenirken hata oluştu:', error);
    });
    
    return {
      myProfile: updatedProfile
    };
  }),
  
  removeOutfit: (outfitId) => set((state) => {
    if (!state.myProfile) return state;
    
    const newOutfits = state.myProfile.savedOutfits.filter(o => o.id !== outfitId);
    const publicOutfitCount = newOutfits.filter(o => o.isPublic).length;
    
    const updatedProfile = {
      ...state.myProfile,
      savedOutfits: newOutfits,
      publicOutfitCount
    };
    
    // AsyncStorage'a kaydet
    saveProfileData(updatedProfile).catch(error => {
      console.error('Kıyafet silinirken hata oluştu:', error);
    });
    
    return {
      myProfile: updatedProfile
    };
  }),
  
  updateOutfit: (outfitId, updates) => set((state) => {
    if (!state.myProfile) return state;
    
    const newOutfits = state.myProfile.savedOutfits.map(outfit => {
      if (outfit.id === outfitId) {
        return { ...outfit, ...updates };
      }
      return outfit;
    });
    
    const publicOutfitCount = newOutfits.filter(o => o.isPublic).length;
    
    const updatedProfile = {
      ...state.myProfile,
      savedOutfits: newOutfits,
      publicOutfitCount
    };
    
    // AsyncStorage'a kaydet
    saveProfileData(updatedProfile).catch(error => {
      console.error('Kıyafet güncellenirken hata oluştu:', error);
    });
    
    return {
      myProfile: updatedProfile
    };
  }),
  
  toggleOutfitVisibility: (outfitId) => set((state) => {
    if (!state.myProfile) return state;
    
    const newOutfits = state.myProfile.savedOutfits.map(outfit => {
      if (outfit.id === outfitId) {
        return { ...outfit, isPublic: !outfit.isPublic };
      }
      return outfit;
    });
    
    const publicOutfitCount = newOutfits.filter(o => o.isPublic).length;
    
    const updatedProfile = {
      ...state.myProfile,
      savedOutfits: newOutfits,
      publicOutfitCount
    };
    
    // AsyncStorage'a kaydet
    saveProfileData(updatedProfile).catch(error => {
      console.error('Kıyafet görünürlüğü değiştirilirken hata oluştu:', error);
    });
    
    return {
      myProfile: updatedProfile
    };
  }),
  
  // Diğer profilleri yönetme
  cacheProfile: (userId, profile) => set((state) => {
    const updatedCache = {
      ...state.profilesCache,
      [userId]: profile
    };
    
    // Önbelleği AsyncStorage'a kaydet
    saveProfilesCache(updatedCache).catch(error => {
      console.error('Profil önbelleği kaydedilirken hata oluştu:', error);
    });
    
    return { 
      profilesCache: updatedCache 
    };
  }),
  
  getCachedProfile: (userId) => {
    return get().profilesCache[userId];
  },
  
  clearCachedProfile: (userId) => set((state) => {
    const { [userId]: _, ...rest } = state.profilesCache;
    
    // Güncellenmiş önbelleği kaydet
    saveProfilesCache(rest).catch(error => {
      console.error('Profil önbelleği güncellenirken hata oluştu:', error);
    });
    
    return { profilesCache: rest };
  }),

  // Kıyafet paylaşım işlemleri
  shareOutfitWithFriend: (outfitId, friendId) => set((state) => {
    if (!state.myProfile) return state;
    
    // Paylaşılacak kıyafeti bul
    const outfitToShare = state.myProfile.savedOutfits.find(outfit => outfit.id === outfitId);
    if (!outfitToShare) return state;
    
    // Kıyafetin sharedWith dizisini güncelle
    const updatedOutfits = state.myProfile.savedOutfits.map(outfit => {
      if (outfit.id === outfitId) {
        const sharedWith = outfit.sharedWith || [];
        // Eğer zaten paylaşılmamışsa ekle
        if (!sharedWith.includes(friendId)) {
          return {
            ...outfit,
            sharedWith: [...sharedWith, friendId]
          };
        }
      }
      return outfit;
    });
    
    const updatedProfile = {
      ...state.myProfile,
      savedOutfits: updatedOutfits
    };
    
    // AsyncStorage'a kaydet
    saveProfileData(updatedProfile).catch(error => {
      console.error('Kıyafet paylaşımı kaydedilirken hata oluştu:', error);
    });
    
    return {
      myProfile: updatedProfile
    };
  }),
  
  addReceivedOutfit: (outfit) => set((state) => {
    if (!state.myProfile) return state;
    
    const receivedOutfits = state.myProfile.receivedOutfits || [];
    
    // Eğer bu kıyafet zaten alınmışsa ekleme
    if (receivedOutfits.some(o => o.id === outfit.id)) {
      return state;
    }
    
    const updatedProfile = {
      ...state.myProfile,
      receivedOutfits: [...receivedOutfits, outfit]
    };
    
    // AsyncStorage'a kaydet
    saveProfileData(updatedProfile).catch(error => {
      console.error('Alınan kıyafet kaydedilirken hata oluştu:', error);
    });
    
    return {
      myProfile: updatedProfile
    };
  })
}));