import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '@/hooks/useAuth';
import Toast, { BaseToast, ErrorToast, ToastProps } from 'react-native-toast-message';
import { View, ActivityIndicator } from 'react-native';
import { photoStore } from '@/store/photoStore';
import { useProfileStore } from '@/store/profileStore';
import { useSocialStore } from '@/store/socialStore';

SplashScreen.preventAutoHideAsync();

// Toast mesajlarının özelleştirilmiş stili
const toastConfig = {
  success: (props: ToastProps) => (
    <BaseToast
      {...props}
      style={{ 
        borderLeftColor: '#4CD964', 
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingVertical: 10,
        marginHorizontal: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 5,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '600',
        color: '#333'
      }}
      text2Style={{
        fontSize: 13,
        color: '#555'
      }}
    />
  ),
  error: (props: ToastProps) => (
    <ErrorToast
      {...props}
      style={{ 
        borderLeftColor: '#FF3B30', 
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingVertical: 10,
        marginHorizontal: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 5,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '600',
        color: '#333'
      }}
      text2Style={{
        fontSize: 13,
        color: '#555'
      }}
    />
  ),
  info: (props: ToastProps) => (
    <BaseToast
      {...props}
      style={{ 
        borderLeftColor: '#007AFF', 
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        paddingVertical: 10,
        marginHorizontal: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 5,
      }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 15,
        fontWeight: '600',
        color: '#333'
      }}
      text2Style={{
        fontSize: 13,
        color: '#555'
      }}
    />
  ),
};

export default function RootLayout() {
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const loadMyProfile = useProfileStore(state => state.loadMyProfile);
  const loadProfilesCache = useProfileStore(state => state.loadProfilesCache);
  const loadSocialData = useSocialStore(state => state.loadSocialData);
  
  useEffect(() => {
    // Uygulama başlatıldığında tüm verileri yükle
    async function loadAllData() {
      try {
        // Paralel olarak tüm store'ların verilerini yükle
        await Promise.all([
          photoStore.getState().loadPhotoData(),
          loadMyProfile(),
          loadProfilesCache(),
          loadSocialData()
        ]);
        
        console.log('Tüm veriler başarıyla yüklendi');
      } catch (error) {
        console.error('Veriler yüklenirken hata oluştu:', error);
      } finally {
        setIsDataLoaded(true);
        SplashScreen.hideAsync();
      }
    }
    
    loadAllData();
  }, []);

  if (!isDataLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="subscription" options={{ presentation: 'modal' }} />
        <Stack.Screen name="+not-found" options={{ presentation: 'modal' }} />
      </Stack>
      <Toast config={toastConfig} />
    </AuthProvider>
  );
}