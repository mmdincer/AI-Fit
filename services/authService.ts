import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@/hooks/useAuth';

// Kullanıcı arayüzü
export interface UserCredentials {
  email: string;
  password: string;
  name?: string;
}

// Kullanıcıların depolanacağı belirli bir anahtar
const USERS_STORAGE_KEY = 'users';

// Tüm kullanıcıları alma
export const getUsers = async (): Promise<Record<string, UserCredentials>> => {
  try {
    const usersJSON = await AsyncStorage.getItem(USERS_STORAGE_KEY);
    return usersJSON ? JSON.parse(usersJSON) : {};
  } catch (error) {
    console.error('Kullanıcılar alınamadı:', error);
    return {};
  }
};

// Kullanıcı kaydı
export const registerUser = async (credentials: UserCredentials): Promise<User | null> => {
  try {
    const users = await getUsers();
    
    // E-posta zaten var mı kontrol et
    if (users[credentials.email]) {
      throw new Error('Bu e-posta adresi zaten kullanımda');
    }
    
    // Yeni kullanıcıyı ekle
    users[credentials.email] = credentials;
    
    // Kullanıcıları kaydet
    await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    
    // Kullanıcı nesnesi döndür
    return {
      id: credentials.email,
      email: credentials.email,
      name: credentials.name || null
    };
  } catch (error) {
    console.error('Kullanıcı kaydı başarısız:', error);
    throw error;
  }
};

// Kullanıcı girişi
export const loginUser = async (email: string, password: string): Promise<User | null> => {
  try {
    const users = await getUsers();
    const user = users[email];
    
    // Kullanıcı yok veya şifre eşleşmiyor
    if (!user || user.password !== password) {
      throw new Error('Geçersiz e-posta veya şifre');
    }
    
    // Kullanıcı nesnesi döndür
    return {
      id: email,
      email: email,
      name: user.name || null
    };
  } catch (error) {
    console.error('Giriş başarısız:', error);
    throw error;
  }
}; 