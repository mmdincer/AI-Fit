import AsyncStorage from '@react-native-async-storage/async-storage';
import { Friend, FriendRequest, Message } from '@/store/socialStore';

// AsyncStorage anahtarları
const FRIENDS_STORAGE_KEY = 'friends';
const FRIEND_REQUESTS_STORAGE_KEY = 'friend_requests';
const MESSAGES_STORAGE_KEY = 'messages';

// Arkadaşları kaydetme
export const saveFriends = async (friends: Friend[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(FRIENDS_STORAGE_KEY, JSON.stringify(friends));
    console.log('Arkadaşlar kaydedildi');
  } catch (error) {
    console.error('Arkadaşlar kaydedilemedi:', error);
    throw error;
  }
};

// Arkadaşları yükleme
export const loadFriends = async (): Promise<Friend[]> => {
  try {
    const friendsJSON = await AsyncStorage.getItem(FRIENDS_STORAGE_KEY);
    return friendsJSON ? JSON.parse(friendsJSON) : [];
  } catch (error) {
    console.error('Arkadaşlar yüklenemedi:', error);
    return [];
  }
};

// Arkadaşlık isteklerini kaydetme
export const saveFriendRequests = async (requests: FriendRequest[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(FRIEND_REQUESTS_STORAGE_KEY, JSON.stringify(requests));
    console.log('Arkadaşlık istekleri kaydedildi');
  } catch (error) {
    console.error('Arkadaşlık istekleri kaydedilemedi:', error);
    throw error;
  }
};

// Arkadaşlık isteklerini yükleme
export const loadFriendRequests = async (): Promise<FriendRequest[]> => {
  try {
    const requestsJSON = await AsyncStorage.getItem(FRIEND_REQUESTS_STORAGE_KEY);
    return requestsJSON ? JSON.parse(requestsJSON) : [];
  } catch (error) {
    console.error('Arkadaşlık istekleri yüklenemedi:', error);
    return [];
  }
};

// Mesajları kaydetme
export const saveMessages = async (messages: Record<string, Message[]>): Promise<void> => {
  try {
    await AsyncStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
    console.log('Mesajlar kaydedildi');
  } catch (error) {
    console.error('Mesajlar kaydedilemedi:', error);
    throw error;
  }
};

// Mesajları yükleme
export const loadMessages = async (): Promise<Record<string, Message[]>> => {
  try {
    const messagesJSON = await AsyncStorage.getItem(MESSAGES_STORAGE_KEY);
    return messagesJSON ? JSON.parse(messagesJSON) : {};
  } catch (error) {
    console.error('Mesajlar yüklenemedi:', error);
    return {};
  }
};

// Bir arkadaşa mesaj gönderme
export const sendMessageToFriend = async (friendId: string, message: Message): Promise<void> => {
  try {
    const messages = await loadMessages();
    const friendMessages = messages[friendId] || [];
    
    messages[friendId] = [...friendMessages, message];
    
    await saveMessages(messages);
  } catch (error) {
    console.error('Mesaj gönderilemedi:', error);
    throw error;
  }
};

// Bir arkadaşın mesajlarını okundu olarak işaretleme
export const markFriendMessagesAsRead = async (friendId: string): Promise<void> => {
  try {
    const messages = await loadMessages();
    const friendMessages = messages[friendId] || [];
    
    if (friendMessages.length === 0) return;
    
    const updatedMessages = friendMessages.map(msg => ({
      ...msg,
      isRead: true
    }));
    
    messages[friendId] = updatedMessages;
    
    await saveMessages(messages);
  } catch (error) {
    console.error('Mesajlar okundu olarak işaretlenemedi:', error);
    throw error;
  }
}; 