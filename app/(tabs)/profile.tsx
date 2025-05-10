import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
  Modal,
  SafeAreaView,
  Image,
  TextInput,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/hooks/useAuth';
import Constants from 'expo-constants';
import { CreditCard, LogOut, ChevronRight, FileText, BookOpen, Info, Mail, Lightbulb, X, Edit, Eye, EyeOff, Share2, Camera, ImagePlus, Settings, PlusCircle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useProfileStore, SavedOutfit } from '../../store/profileStore';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [isTipsModalVisible, setIsTipsModalVisible] = useState(false);
  const [isEditProfileVisible, setIsEditProfileVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isSaveOutfitModalVisible, setIsSaveOutfitModalVisible] = useState(false);
  
  // Profil store'undan verileri al
  const { myProfile, updateMyProfile, toggleOutfitVisibility, addOutfit } = useProfileStore();
  
  // Yeni outfit bilgileri için state'ler
  const [newOutfitName, setNewOutfitName] = useState('');
  const [newOutfitDesc, setNewOutfitDesc] = useState('');
  const [newOutfitImage, setNewOutfitImage] = useState<string | null>(null);
  
  // Profili düzenleme için state'ler
  const [editDisplayName, setEditDisplayName] = useState(myProfile?.displayName || '');
  const [editBio, setEditBio] = useState(myProfile?.bio || '');
  
  useEffect(() => {
    checkSubscriptionStatus();
    
    // Eğer profil boşsa ve kullanıcı varsa
    if (!myProfile && user) {
      initializeProfile();
    }
    
    // Örnek kıyafetler ekleyelim (sadece ilk kez)
    if (myProfile && myProfile.savedOutfits.length === 0) {
      createExampleOutfits();
    }
  }, [user, myProfile]);
  
  // Örnek kıyafetler oluştur
  const createExampleOutfits = () => {
    const exampleOutfit1: SavedOutfit = {
      id: 'outfit-' + Date.now(),
      name: 'Günlük Kombin',
      description: 'Hafta sonu için rahat bir kombin',
      imageUrl: 'https://example.com/outfit1.jpg', // Gerçek bir URL olmadığı için görüntülenmeyecek
      createdAt: Date.now(),
      isPublic: true
    };
    
    addOutfit(exampleOutfit1);
    
    // İkinci örnek kıyafet (biraz bekletip ekleyelim)
    setTimeout(() => {
      const exampleOutfit2: SavedOutfit = {
        id: 'outfit-' + (Date.now() + 1),
        name: 'Spor Tarzı',
        description: 'Spor salonuna giderken giyilebilecek kombin',
        imageUrl: 'https://example.com/outfit2.jpg', // Gerçek bir URL olmadığı için görüntülenmeyecek
        createdAt: Date.now(),
        isPublic: false
      };
      addOutfit(exampleOutfit2);
    }, 500);
  };
  
  // Yeni bir profil oluştur
  const initializeProfile = () => {
    if (!user) return;
    
    const newProfile = {
      userId: user.id,
      displayName: user.name || user.email?.split('@')[0] || 'User',
      bio: 'Hey there! I love trying on virtual outfits.',
      profilePicture: null,
      savedOutfits: [],
      publicOutfitCount: 0,
      receivedOutfits: [] // Yeni eklendi - başkalarından alınan kıyafetler
    };
    
    updateMyProfile(newProfile);
  };

  const checkSubscriptionStatus = async () => {
    try {
      const status = await AsyncStorage.getItem('isPremium');
      setIsPremium(status === 'true');
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          }
        },
      ]
    );
  };

  const handleManageSubscription = () => {
    router.push('/subscription');
  };

  const handleOpenURL = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Don\'t know how to open this URL: ${url}');
    }
  };
  
  const handleUpdateProfile = () => {
    updateMyProfile({
      displayName: editDisplayName,
      bio: editBio
    });
    setIsEditProfileVisible(false);
  };
  
  const handleSelectProfilePicture = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow gallery access to select photos');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        updateMyProfile({ profilePicture: result.assets[0].uri });
      }
    } catch (error) {
      console.error('Error selecting profile picture:', error);
    }
  };
  
  const handleToggleVisibility = (outfitId: string) => {
    toggleOutfitVisibility(outfitId);
  };
  
  const handleShareOutfit = (outfit: SavedOutfit) => {
    Alert.alert(
      'Share Outfit',
      'Bu kıyafeti paylaşmak için sosyal sekmesine gidin ve bir arkadaşla sohbet başlatın.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sosyal Sekmesine Git', 
          onPress: () => router.push('/social')
        }
      ]
    );
  };

  // Yeni kıyafet oluşturmak için fonksiyon
  const handleCreateOutfit = () => {
    if (!newOutfitName.trim()) {
      Alert.alert('Hata', 'Lütfen kıyafet için bir isim girin.');
      return;
    }
    
    if (!newOutfitImage) {
      Alert.alert('Hata', 'Lütfen bir kıyafet görseli seçin.');
      return;
    }
    
    const newOutfit: SavedOutfit = {
      id: 'outfit-' + Date.now(),
      name: newOutfitName,
      description: newOutfitDesc || 'Açıklama yok',
      imageUrl: newOutfitImage,
      createdAt: Date.now(),
      isPublic: false
    };
    
    addOutfit(newOutfit);
    
    // Form alanlarını temizle
    setNewOutfitName('');
    setNewOutfitDesc('');
    setNewOutfitImage(null);
    setIsSaveOutfitModalVisible(false);
    
    Alert.alert('Başarılı', 'Yeni kıyafet kaydedildi!');
  };
  
  // Kıyafet görseli seçmek için
  const handleSelectOutfitImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('İzin gerekli', 'Lütfen galeriye erişim izni verin');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setNewOutfitImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error selecting outfit image:', error);
    }
  };

  const SettingItem = ({ 
    icon, 
    title, 
    onPress, 
    rightElement = <ChevronRight size={20} color="#C7C7CC" />,
    showDivider = true
  }: { 
    icon: React.ReactNode;
    title: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    showDivider?: boolean;
  }) => (
    <>
      <TouchableOpacity 
        style={styles.settingItem} 
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={onPress ? 0.7 : 1}
      >
        <View style={styles.settingIconContainer}>
          {icon}
        </View>
        <Text style={styles.settingText}>{title}</Text>
        <View style={styles.settingRightElement}>
          {rightElement}
        </View>
      </TouchableOpacity>
      {showDivider && <View style={styles.divider} />}
    </>
  );

  const SettingsSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );
  
  const OutfitCard = ({ outfit }: { outfit: SavedOutfit }) => (
    <View style={styles.outfitCard}>
      <Image 
        source={{ uri: outfit.imageUrl }} 
        style={styles.outfitImage}
        defaultSource={require('@/assets/images/outfit-placeholder.png')} 
      />
      <View style={styles.outfitInfo}>
        <Text style={styles.outfitName}>{outfit.name}</Text>
        <Text style={styles.outfitDescription} numberOfLines={1}>{outfit.description}</Text>
        <Text style={styles.outfitSharedStatus}>
          {outfit.sharedWith && outfit.sharedWith.length > 0 
            ? `${outfit.sharedWith.length} kişi ile paylaşıldı` 
            : 'Henüz paylaşılmadı'}
        </Text>
      </View>
      <View style={styles.outfitActions}>
        <TouchableOpacity 
          style={styles.outfitAction}
          onPress={() => handleToggleVisibility(outfit.id)}
        >
          {outfit.isPublic ? (
            <Eye size={20} color="#0A84FF" />
          ) : (
            <EyeOff size={20} color="#8E8E93" />
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.outfitAction}
          onPress={() => handleShareOutfit(outfit)}
        >
          <Share2 size={20} color="#0A84FF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Alınan kıyafetler bölümünü ekleyelim
  const ReceivedOutfitsSection = () => {
    if (!myProfile?.receivedOutfits || myProfile.receivedOutfits.length === 0) {
      return null;
    }
    
    return (
      <View style={styles.outfitsSection}>
        <Text style={styles.sectionTitle}>Paylaşılan Kıyafetler</Text>
        
        {myProfile.receivedOutfits.map((outfit) => (
          <View key={outfit.id} style={styles.outfitCard}>
            <Image 
              source={{ uri: outfit.imageUrl }} 
              style={styles.outfitImage}
              defaultSource={require('@/assets/images/outfit-placeholder.png')} 
            />
            <View style={styles.outfitInfo}>
              <Text style={styles.outfitName}>{outfit.name}</Text>
              <Text style={styles.outfitDescription} numberOfLines={1}>{outfit.description}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <>
      <ScrollView style={styles.container}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity 
            style={styles.profilePictureContainer}
            onPress={handleSelectProfilePicture}
          >
            {myProfile?.profilePicture ? (
              <Image 
                source={{ uri: myProfile.profilePicture }} 
                style={styles.profilePicture} 
              />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Camera size={24} color="#8E8E93" />
              </View>
            )}
            <View style={styles.editProfilePicture}>
              <ImagePlus size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          
          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>{myProfile?.displayName || 'User'}</Text>
            <Text style={styles.bio}>{myProfile?.bio || ''}</Text>
            
            <View style={styles.profileStats}>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{myProfile?.savedOutfits.length || 0}</Text>
                <Text style={styles.statLabel}>Outfits</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{myProfile?.publicOutfitCount || 0}</Text>
                <Text style={styles.statLabel}>Public</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.profileActions}>
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => {
                setEditDisplayName(myProfile?.displayName || '');
                setEditBio(myProfile?.bio || '');
                setIsEditProfileVisible(true);
              }}
            >
              <Edit size={16} color="#0A84FF" />
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => setIsSettingsVisible(true)}
            >
              <Settings size={16} color="#0A84FF" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* "Kıyafet Oluştur" butonu ekleyelim */}
        <TouchableOpacity
          style={styles.createOutfitButton}
          onPress={() => setIsSaveOutfitModalVisible(true)}
        >
          <PlusCircle size={20} color="#FFFFFF" />
          <Text style={styles.createOutfitButtonText}>Yeni Kıyafet Oluştur</Text>
        </TouchableOpacity>
        
        {/* Saved Outfits */}
        <View style={styles.outfitsSection}>
          <Text style={styles.sectionTitle}>My Outfits</Text>
          
          {myProfile?.savedOutfits && myProfile.savedOutfits.length > 0 ? (
            myProfile.savedOutfits.map((outfit) => (
              <OutfitCard key={outfit.id} outfit={outfit} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No saved outfits yet</Text>
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => router.push('/')}
              >
                <Text style={styles.createButtonText}>Create an Outfit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* Alınan Kıyafetler Bölümü */}
        <ReceivedOutfitsSection />
      </ScrollView>
      
      {/* Settings Modal */}
      <Modal
        visible={isSettingsVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsSettingsVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setIsSettingsVisible(false)}
            >
              <ChevronRight size={24} color="#000000" style={{transform: [{rotate: '180deg'}]}} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Settings</Text>
            <View style={{width: 40}} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            <SettingsSection title="Subscription">
              <SettingItem
                icon={<CreditCard size={22} color="#0A84FF" />}
                title={isPremium ? "Manage Subscription" : "Upgrade to Premium"}
                onPress={handleManageSubscription}
                rightElement={
                  isPremium ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>ACTIVE</Text>
                    </View>
                  ) : (
                    <ChevronRight size={20} color="#8E8E93" />
                  )
                }
                showDivider={false}
              />
            </SettingsSection>

            <SettingsSection title="Legal">
              <SettingItem
                icon={<FileText size={22} color="#8E8E93" />}
                title="Privacy Policy"
                onPress={() => handleOpenURL('https://example.com/privacy')}
              />
              <SettingItem
                icon={<BookOpen size={22} color="#8E8E93" />}
                title="Terms of Service"
                onPress={() => handleOpenURL('https://example.com/terms')}
                showDivider={false}
              />
            </SettingsSection>

            <SettingsSection title="Help & Info">
              <SettingItem
                icon={<Lightbulb size={22} color="#FFD60A" />} 
                title="Photo Upload Tips"
                onPress={() => {
                  setIsSettingsVisible(false);
                  setIsTipsModalVisible(true);
                }}
              />
              <SettingItem
                icon={<Info size={22} color="#8E8E93" />}
                title="Version"
                rightElement={<Text style={styles.versionInfoText}>{Constants.expoConfig?.version || 'N/A'}</Text>}
                showDivider={false} 
              />
            </SettingsSection>

            <SettingsSection title="Support">
              <SettingItem
                icon={<Mail size={22} color="#8E8E93" />}
                title="Send Feedback"
                onPress={() => {
                  const appVersion = Constants.expoConfig?.version || 'N/A';
                  const subject = `App Feedback - v${appVersion}`;
                  const mailtoUrl = `mailto:destek@ornek.com?subject=${encodeURIComponent(subject)}`;
                  handleOpenURL(mailtoUrl);
                }}
                showDivider={false}
              />
            </SettingsSection>

            <SettingsSection title="Account">
              <SettingItem
                icon={<LogOut size={22} color="#FF453A" />}
                title="Sign Out"
                onPress={handleSignOut}
                showDivider={false}
              />
            </SettingsSection>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      
      {/* Edit Profile Modal */}
      <Modal
        visible={isEditProfileVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditProfileVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsEditProfileVisible(false)}
            >
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Display Name</Text>
              <TextInput
                style={styles.formInput}
                value={editDisplayName}
                onChangeText={setEditDisplayName}
                placeholder="Your display name"
                placeholderTextColor="#8E8E93"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Bio</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Tell others about yourself"
                placeholderTextColor="#8E8E93"
                multiline={true}
                numberOfLines={4}
              />
            </View>
            
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleUpdateProfile}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      
      {/* Tips Modal (yeniden kullanıldı) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isTipsModalVisible}
        onRequestClose={() => {
          setIsTipsModalVisible(false);
        }}
      >
        <SafeAreaView style={styles.modalOverlay}> 
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Photo Upload Tips</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setIsTipsModalVisible(false)}
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollContent}>
              <View style={styles.tipSection}>
                <Text style={styles.tipTitle}>For Best Body Photos:</Text>
                <Text style={styles.tipText}>• Stand straight in a neutral pose</Text>
                <Text style={styles.tipText}>• Use good lighting (natural light works best)</Text>
                <Text style={styles.tipText}>• Use a plain background</Text>
                <Text style={styles.tipText}>• Wear form-fitting clothes if not using nude mode</Text>
                
                <View style={styles.exampleContainer}>
                  <View style={styles.imagePlaceholder}>
                    {/* Bu alanlar gerçek görsel örnekleriyle değiştirilmeli */}
                  </View>
                  <Text style={styles.exampleCaption}>Good Example</Text>
                </View>
              </View>
              
              <View style={styles.tipSection}>
                <Text style={styles.tipTitle}>For Best Garment Photos:</Text>
                <Text style={styles.tipText}>• Lay the garment flat or use a hanger</Text>
                <Text style={styles.tipText}>• Capture the entire garment</Text>
                <Text style={styles.tipText}>• Use good lighting</Text>
                <Text style={styles.tipText}>• Avoid busy backgrounds</Text>
                
                <View style={styles.exampleContainer}>
                  <View style={styles.imagePlaceholder}>
                    {/* Bu alanlar gerçek görsel örnekleriyle değiştirilmeli */}
                  </View>
                  <Text style={styles.exampleCaption}>Good Example</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  profileHeader: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  profilePictureContainer: {
    alignSelf: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2C2C2E',
  },
  profilePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editProfilePicture: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0A84FF',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  profileInfo: {
    alignItems: 'center',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 5,
  },
  bio: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 20,
    textAlign: 'center',
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stat: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  profileActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  editProfileText: {
    color: '#0A84FF',
    marginLeft: 5,
    fontWeight: '500',
  },
  settingsButton: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  outfitsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 15,
    marginTop: 10,
  },
  outfitCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
  },
  outfitImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  outfitInfo: {
    padding: 15,
  },
  outfitName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 5,
  },
  outfitDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  outfitActions: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#3A3A3C',
  },
  outfitAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#0A84FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  closeButton: {
    padding: 5,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  
  // Form styles
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    color: '#000000',
    marginBottom: 10,
    fontSize: 16,
  },
  formInput: {
    backgroundColor: '#F5F5F5',
    color: '#000000',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#0A84FF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Settings styles
  section: {
    marginBottom: 30,
  },
  sectionContent: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  settingIconContainer: {
    width: 30,
    alignItems: 'center',
    marginRight: 16,
  },
  settingText: {
    flex: 1,
    fontSize: 17,
    color: '#000000',
  },
  settingRightElement: {
    marginLeft: 8,
  },
  divider: {
    height: 0.5,
    backgroundColor: '#E0E0E0',
    marginLeft: 62,
  },
  badge: {
    backgroundColor: 'rgba(48, 209, 88, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    color: '#30D158',
    fontWeight: '600',
  },
  versionInfoText: {
    fontSize: 17,
    color: '#8E8E93',
  },
  
  // Tips modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  modalScrollContent: {
    padding: 20,
  },
  tipSection: {
    marginBottom: 30,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 15,
  },
  tipText: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 10,
    lineHeight: 24,
  },
  exampleContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  imagePlaceholder: {
    width: 200,
    height: 300,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    marginBottom: 10,
  },
  exampleCaption: {
    fontSize: 14,
    color: '#8E8E93',
  },
  
  // Yeni eklenen stiller
  createOutfitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A84FF',
    borderRadius: 10,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 20,
  },
  createOutfitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  imagePickerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  selectedOutfitImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  imagePlaceholderText: {
    color: '#8E8E93',
    marginTop: 10,
  },
  outfitSharedStatus: {
    fontSize: 12,
    color: '#0A84FF',
    marginTop: 4,
  },
  backButton: {
    padding: 8,
  },
});