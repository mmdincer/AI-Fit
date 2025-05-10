import { create } from 'zustand';

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
  
  // Profil işlemleri
  setMyProfile: (profile: ProfileData) => void;
  updateMyProfile: (updates: Partial<ProfileData>) => void;
  
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
  
  // Profil işlemleri
  setMyProfile: (profile) => set({ myProfile: profile }),
  
  updateMyProfile: (updates) => set((state) => {
    if (!state.myProfile) return state;
    
    return {
      myProfile: {
        ...state.myProfile,
        ...updates
      }
    };
  }),
  
  // Kıyafet işlemleri
  addOutfit: (outfit) => set((state) => {
    if (!state.myProfile) return state;
    
    const newOutfits = [...state.myProfile.savedOutfits, outfit];
    const publicOutfitCount = newOutfits.filter(o => o.isPublic).length;
    
    return {
      myProfile: {
        ...state.myProfile,
        savedOutfits: newOutfits,
        publicOutfitCount
      }
    };
  }),
  
  removeOutfit: (outfitId) => set((state) => {
    if (!state.myProfile) return state;
    
    const newOutfits = state.myProfile.savedOutfits.filter(o => o.id !== outfitId);
    const publicOutfitCount = newOutfits.filter(o => o.isPublic).length;
    
    return {
      myProfile: {
        ...state.myProfile,
        savedOutfits: newOutfits,
        publicOutfitCount
      }
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
    
    return {
      myProfile: {
        ...state.myProfile,
        savedOutfits: newOutfits,
        publicOutfitCount
      }
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
    
    return {
      myProfile: {
        ...state.myProfile,
        savedOutfits: newOutfits,
        publicOutfitCount
      }
    };
  }),
  
  // Diğer profilleri yönetme
  cacheProfile: (userId, profile) => set((state) => ({
    profilesCache: {
      ...state.profilesCache,
      [userId]: profile
    }
  })),
  
  getCachedProfile: (userId) => {
    return get().profilesCache[userId];
  },
  
  clearCachedProfile: (userId) => set((state) => {
    const { [userId]: _, ...rest } = state.profilesCache;
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
    
    return {
      myProfile: {
        ...state.myProfile,
        savedOutfits: updatedOutfits
      }
    };
  }),
  
  addReceivedOutfit: (outfit) => set((state) => {
    if (!state.myProfile) return state;
    
    const receivedOutfits = state.myProfile.receivedOutfits || [];
    
    // Eğer bu kıyafet zaten alınmışsa ekleme
    if (receivedOutfits.some(o => o.id === outfit.id)) {
      return state;
    }
    
    return {
      myProfile: {
        ...state.myProfile,
        receivedOutfits: [...receivedOutfits, outfit]
      }
    };
  })
}));