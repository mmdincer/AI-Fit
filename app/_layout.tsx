import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '@/hooks/useAuth';
import Toast, { BaseToast, ErrorToast, ToastProps } from 'react-native-toast-message';

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
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

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