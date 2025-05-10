import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Platform,
  Image,
  ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as AppleAuthentication from 'expo-apple-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
  const { signIn, isLoading } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleAppleSignIn = async () => {
    try {
      setIsAuthenticating(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      
      // Pass the credential to your authentication context
      await signIn({
        id: credential.user,
        email: credential.email || 'user@example.com', // Email may be null
        name: credential.fullName?.givenName || 'User',
      });
      
      router.replace('/(tabs)');
    } catch (e: any) {
      if (e.code === 'ERR_REQUEST_CANCELED') {
        // User canceled the login
        console.log('User canceled Apple login');
      } else {
        Alert.alert('Authentication Error', 'Could not complete sign in');
        console.error('Apple auth error:', e);
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  // For testing purposes only - in a real app this would be removed
  const handleSkipAuth = async () => {
    try {
      setIsAuthenticating(true);
      await signIn({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      });
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Error', 'Could not complete sign in');
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centeredContainer]}>
        <ActivityIndicator size="large" color="#0A84FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.headerContainer}>
        <Image 
          source={{ uri: 'https://images.pexels.com/photos/4641825/pexels-photo-4641825.jpeg' }} 
          style={styles.headerImage} 
        />
      </View>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Virtual Try-On</Text>
        <Text style={styles.subtitle}>
          Try on clothes virtually before you buy them
        </Text>
        
        <View style={styles.buttonContainer}>
          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={8}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
            />
          )}

          {/* Google Sign-In Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => {
              console.log('Google Sign-In button pressed');
              Alert.alert('Google Sign-In', 'Frontend only: Google Sign-In initiated.');
            }}
            disabled={isAuthenticating}
          >
            <View style={styles.googleButtonContent}>
              <Image 
                source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                style={styles.googleIcon} 
              />
              <Text style={styles.googleButtonText}>
                {isAuthenticating ? 'Signing in...' : 'Sign in with Google'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* For testing in development - would be removed in production */}
          {__DEV__ && (
            <TouchableOpacity 
              style={styles.devButton} 
              onPress={handleSkipAuth}
              disabled={isAuthenticating}
            >
              <Text style={styles.devButtonText}>
                {isAuthenticating ? 'Signing in...' : 'Continue as Test User'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        <Text style={styles.termsText}>
          By continuing, you agree to our{' '}
          <Text style={styles.linkText}>Terms of Service</Text> and{' '}
          <Text style={styles.linkText}>Privacy Policy</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  centeredContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    height: '45%',
    width: '100%',
  },
  headerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 17,
    color: '#B0B0B0',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 20,
  },
  appleButton: {
    width: '100%',
    height: 50,
    marginBottom: 12,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 12,
    width: '100%',
    height: 50,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    justifyContent: 'center',
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  googleButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4285F4',
  },
  devButton: {
    backgroundColor: '#323232',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  devButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  termsText: {
    fontSize: 13,
    color: '#B0B0B0',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
  linkText: {
    color: '#0A84FF',
  },
});