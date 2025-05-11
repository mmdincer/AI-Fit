import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Platform,
  Image,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  ScrollView
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as AppleAuthentication from 'expo-apple-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/hooks/useAuth';
import { loginUser } from '@/services/authService';
import { Mail } from 'lucide-react-native';

export default function LoginScreen() {
  const { signIn, isLoading: authLoading } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isEmailLogin, setIsEmailLogin] = useState(false);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'Lütfen e-posta ve şifrenizi girin');
      return;
    }

    try {
      setIsAuthenticating(true);
      const user = await loginUser(email, password);
      if (user) {
        await signIn(user);
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      Alert.alert('Giriş Hatası', error.message || 'Giriş yapılamadı');
    } finally {
      setIsAuthenticating(false);
    }
  };

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

  if (authLoading) {
    return (
      <View style={[styles.container, styles.centeredContainer]}>
        <ActivityIndicator size="large" color="#0A84FF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          <Image 
            source={require('@/assets/images/background.jpg')} 
            style={styles.headerImage} 
          />
        </View>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>AI-Fit'e Hoş Geldiniz</Text>
          {isEmailLogin ? (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>E-posta</Text>
                <TextInput
                  style={styles.input}
                  placeholder="E-posta adresinizi girin"
                  placeholderTextColor="#888"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Şifre</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Şifrenizi girin"
                  placeholderTextColor="#888"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
              
              <TouchableOpacity 
                style={styles.emailButton}
                onPress={handleEmailLogin}
                disabled={isAuthenticating}
              >
                {isAuthenticating ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Mail size={18} color="#FFFFFF" style={styles.buttonIcon} />
                    <Text style={styles.emailButtonText}>Giriş Yap</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.switchButton}
                onPress={() => setIsEmailLogin(false)}
              >
                <Text style={styles.switchButtonText}>Diğer Giriş Seçenekleri</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.emailLoginButton} 
                onPress={() => setIsEmailLogin(true)}
              >
                <Mail size={18} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.emailLoginText}>E-posta ile Giriş Yap</Text>
              </TouchableOpacity>
              
              {Platform.OS === 'ios' && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={12}
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
                  <Text style={styles.googleButtonText}>Google ile Giriş Yap</Text>
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
                    {isAuthenticating ? 'Signing in...' : 'Test Kullanıcısı ile Devam Et'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Hesabınız yok mu?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerLink}>Kayıt Ol</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.termsText}>
            By continuing, you agree to our{' '}
            <Text style={styles.linkText}>Terms of Service</Text> and{' '}
            <Text style={styles.linkText}>Privacy Policy</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  centeredContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    height: 320,
    width: '100%',
    overflow: 'hidden',
  },
  headerImage: {
    height: '100%',
    width: '100%',
    resizeMode: 'cover',
  },
  contentContainer: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonContainer: {
    marginVertical: 20,
  },
  form: {
    marginVertical: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  emailButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  emailLoginButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emailLoginText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  appleButton: {
    height: 52,
    width: '100%',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  devButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  devButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  switchButton: {
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
  },
  switchButtonText: {
    color: '#0A84FF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: {
    fontSize: 16,
    color: '#333333',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  registerLink: {
    marginLeft: 4,
    fontSize: 16,
    fontWeight: '600',
    color: '#0A84FF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  termsText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  linkText: {
    color: '#0A84FF',
  },
  buttonIcon: {
    marginRight: 8,
  },
});