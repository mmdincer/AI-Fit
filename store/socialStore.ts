import { create } from 'zustand';
import { 
  loadFriends, 
  saveFriends, 
  loadFriendRequests, 
  saveFriendRequests, 
  loadMessages, 
  saveMessages 
} from '@/services/socialService';

export interface Friend {
  id: string;
  name: string;
  email: string;
  profilePicture: string | null;
  isRequestPending?: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  imageUrl?: string | null;
  timestamp: number;
  isRead: boolean;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderProfilePicture: string | null;
  timestamp: number;
}

interface SocialState {
  friends: Friend[];
  friendRequests: FriendRequest[];
  messages: Record<string, Message[]>; // friendId -> messages
  isLoading: boolean;
  
  // Veri yükleme
  loadSocialData: () => Promise<void>;
  
  // Arkadaş işlemleri
  addFriend: (friend: Friend) => void;
  removeFriend: (friendId: string) => void;
  
  // Arkadaşlık istekleri
  addFriendRequest: (request: FriendRequest) => void;
  removeFriendRequest: (requestId: string) => void;
  acceptFriendRequest: (requestId: string, friend: Friend) => void;
  rejectFriendRequest: (requestId: string) => void;
  
  // Mesajlaşma
  sendMessage: (friendId: string, message: Message) => void;
  markMessagesAsRead: (friendId: string) => void;
  getUnreadMessageCount: (friendId: string) => number;
  getTotalUnreadMessageCount: () => number;
}

export const useSocialStore = create<SocialState>((set, get) => ({
  friends: [],
  friendRequests: [],
  messages: {},
  isLoading: false,
  
  // Tüm sosyal verileri yükleme
  loadSocialData: async () => {
    try {
      set({ isLoading: true });
      
      // Paralel olarak tüm verileri yükle
      const [friends, friendRequests, messages] = await Promise.all([
        loadFriends(),
        loadFriendRequests(),
        loadMessages()
      ]);
      
      set({
        friends,
        friendRequests,
        messages,
        isLoading: false
      });
    } catch (error) {
      console.error('Sosyal veri yüklenirken hata oluştu:', error);
      set({ isLoading: false });
    }
  },
  
  // Arkadaş işlemleri
  addFriend: (friend) => set((state) => { 
    const updatedFriends = [...state.friends, friend];
    
    // AsyncStorage'a kaydet
    saveFriends(updatedFriends).catch(error => {
      console.error('Arkadaş eklenirken hata oluştu:', error);
    });
    
    return { friends: updatedFriends };
  }),
  
  removeFriend: (friendId) => set((state) => {
    const updatedFriends = state.friends.filter(friend => friend.id !== friendId);
    
    // Arkadaşların mesajlarını filtrele
    const { [friendId]: _, ...restMessages } = state.messages;
    
    // AsyncStorage'a kaydet
    saveFriends(updatedFriends).catch(error => {
      console.error('Arkadaş silinirken hata oluştu:', error);
    });
    
    saveMessages(restMessages).catch(error => {
      console.error('Mesajlar güncellenirken hata oluştu:', error);
    });
    
    return { 
      friends: updatedFriends,
      messages: restMessages
    };
  }),
  
  // Arkadaşlık istekleri
  addFriendRequest: (request) => set((state) => {
    const updatedRequests = [...state.friendRequests, request];
    
    // AsyncStorage'a kaydet
    saveFriendRequests(updatedRequests).catch(error => {
      console.error('Arkadaşlık isteği eklenirken hata oluştu:', error);
    });
    
    return { friendRequests: updatedRequests };
  }),
  
  removeFriendRequest: (requestId) => set((state) => {
    const updatedRequests = state.friendRequests.filter(req => req.id !== requestId);
    
    // AsyncStorage'a kaydet
    saveFriendRequests(updatedRequests).catch(error => {
      console.error('Arkadaşlık isteği kaldırılırken hata oluştu:', error);
    });
    
    return { friendRequests: updatedRequests };
  }),
  
  acceptFriendRequest: (requestId, friend) => set((state) => {
    // Arkadaş isteğini kabul et ve arkadaş listesine ekle
    const updatedFriends = [...state.friends, friend];
    const updatedRequests = state.friendRequests.filter(req => req.id !== requestId);
    
    // AsyncStorage'a kaydet
    saveFriends(updatedFriends).catch(error => {
      console.error('Arkadaş eklenirken hata oluştu:', error);
    });
    
    saveFriendRequests(updatedRequests).catch(error => {
      console.error('Arkadaşlık isteği güncellenirken hata oluştu:', error);
    });
    
    return {
      friends: updatedFriends,
      friendRequests: updatedRequests
    };
  }),
  
  rejectFriendRequest: (requestId) => set((state) => {
    const updatedRequests = state.friendRequests.filter(req => req.id !== requestId);
    
    // AsyncStorage'a kaydet
    saveFriendRequests(updatedRequests).catch(error => {
      console.error('Arkadaşlık isteği reddedilirken hata oluştu:', error);
    });
    
    return {
      friendRequests: updatedRequests
    };
  }),
  
  // Mesajlaşma
  sendMessage: (friendId, message) => set((state) => {
    const existingMessages = state.messages[friendId] || [];
    const updatedMessages = {
      ...state.messages,
      [friendId]: [...existingMessages, message]
    };
    
    // AsyncStorage'a kaydet
    saveMessages(updatedMessages).catch(error => {
      console.error('Mesaj gönderilirken hata oluştu:', error);
    });
    
    return {
      messages: updatedMessages
    };
  }),
  
  markMessagesAsRead: (friendId) => set((state) => {
    const friendMessages = state.messages[friendId] || [];
    
    if (friendMessages.length === 0) return state;
    
    const updatedMessages = friendMessages.map(msg => ({
      ...msg,
      isRead: true
    }));
    
    const newMessagesState = {
      ...state.messages,
      [friendId]: updatedMessages
    };
    
    // AsyncStorage'a kaydet
    saveMessages(newMessagesState).catch(error => {
      console.error('Mesajlar okundu olarak işaretlenirken hata oluştu:', error);
    });
    
    return {
      messages: newMessagesState
    };
  }),
  
  getUnreadMessageCount: (friendId) => {
    const state = get();
    const friendMessages = state.messages[friendId] || [];
    return friendMessages.filter(msg => !msg.isRead && msg.senderId === friendId).length;
  },
  
  getTotalUnreadMessageCount: () => {
    const state = get();
    let count = 0;
    
    Object.keys(state.messages).forEach(friendId => {
      count += state.messages[friendId].filter(
        msg => !msg.isRead && msg.senderId === friendId
      ).length;
    });
    
    return count;
  }
}));