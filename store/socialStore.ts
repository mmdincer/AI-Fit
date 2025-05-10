import { create } from 'zustand';

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
  
  // Arkadaş işlemleri
  addFriend: (friend) => set((state) => ({ 
    friends: [...state.friends, friend] 
  })),
  
  removeFriend: (friendId) => set((state) => ({ 
    friends: state.friends.filter(friend => friend.id !== friendId),
    // Mesajları da temizle
    messages: Object.keys(state.messages).reduce((acc, key) => {
      if (key !== friendId) {
        acc[key] = state.messages[key];
      }
      return acc;
    }, {} as Record<string, Message[]>)
  })),
  
  // Arkadaşlık istekleri
  addFriendRequest: (request) => set((state) => ({ 
    friendRequests: [...state.friendRequests, request] 
  })),
  
  removeFriendRequest: (requestId) => set((state) => ({ 
    friendRequests: state.friendRequests.filter(req => req.id !== requestId) 
  })),
  
  acceptFriendRequest: (requestId, friend) => set((state) => {
    // Arkadaş isteğini kabul et ve arkadaş listesine ekle
    return {
      friends: [...state.friends, friend],
      friendRequests: state.friendRequests.filter(req => req.id !== requestId)
    };
  }),
  
  rejectFriendRequest: (requestId) => set((state) => ({
    friendRequests: state.friendRequests.filter(req => req.id !== requestId)
  })),
  
  // Mesajlaşma
  sendMessage: (friendId, message) => set((state) => {
    const existingMessages = state.messages[friendId] || [];
    return {
      messages: {
        ...state.messages,
        [friendId]: [...existingMessages, message]
      }
    };
  }),
  
  markMessagesAsRead: (friendId) => set((state) => {
    const friendMessages = state.messages[friendId] || [];
    const updatedMessages = friendMessages.map(msg => ({
      ...msg,
      isRead: true
    }));
    
    return {
      messages: {
        ...state.messages,
        [friendId]: updatedMessages
      }
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