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
  const { user, signOut, isLoading } = useAuth();
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
    try {
      await signOut();
      router.replace('/(auth)/login');
    } catch (error) {
      Alert.alert('Hata', 'Çıkış yapılırken bir sorun oluştu');
    }
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

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (!user) {
    router.replace('/(auth)/login');
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.profilePictureContainer}>
          {myProfile?.profilePicture ? (
            <Image 
              source={{ uri: myProfile.profilePicture }} 
              style={styles.profilePicture} 
            />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.profileInitials}>
                {myProfile?.displayName?.substring(0, 1) || user.name?.substring(0, 1) || "U"}
              </Text>
            </View>
          )}
          <TouchableOpacity 
            style={styles.editProfilePicture}
            onPress={handleSelectProfilePicture}
          >
            <Camera size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.profileInfo}>
          <Text style={styles.displayName}>{myProfile?.displayName || user.name || 'Kullanıcı'}</Text>
          <Text style={styles.bio}>{myProfile?.bio || 'Henüz bir biyografi eklenmedi.'}</Text>
        </View>
        
        <View style={styles.profileStats}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{myProfile?.savedOutfits.length || 0}</Text>
            <Text style={styles.statLabel}>Kombinler</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{myProfile?.publicOutfitCount || 0}</Text>
            <Text style={styles.statLabel}>Paylaşılan</Text>
          </View>
        </View>
        
        <View style={styles.profileActions}>
          <TouchableOpacity 
            style={styles.editProfileButton}
            onPress={() => setIsEditProfileVisible(true)}
          >
            <Edit size={16} color="#0A84FF" />
            <Text style={styles.editProfileText}>Profili Düzenle</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => setIsSettingsVisible(true)}
          >
            <Settings size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.outfitsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Kombinlerim</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setIsSaveOutfitModalVisible(true)}
          >
            <PlusCircle size={20} color="#0A84FF" />
          </TouchableOpacity>
        </View>
        
        {myProfile?.savedOutfits && myProfile.savedOutfits.length > 0 ? (
          myProfile.savedOutfits.map((outfit) => (
            <OutfitCard key={outfit.id} outfit={outfit} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Henüz kaydettiğiniz bir kombiniz yok</Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => setIsSaveOutfitModalVisible(true)}
            >
              <Text style={styles.createButtonText}>İlk Kombinini Oluştur</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      <ReceivedOutfitsSection />
      
      <View style={styles.logoutSection}>
        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={() => {
            Alert.alert(
              'Çıkış Yap',
              'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
              [
                { text: 'İptal', style: 'cancel' },
                { text: 'Çıkış Yap', onPress: handleSignOut, style: 'destructive' }
              ]
            );
          }}
        >
          <LogOut size={20} color="#FFFFFF" style={{marginRight: 8}} />
          <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
      
      {/* Edit Profile Modal */}
      <Modal
        visible={isEditProfileVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setIsEditProfileVisible(false)}
            >
              <X size={24} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Profili Düzenle</Text>
            <TouchableOpacity onPress={handleUpdateProfile}>
              <Text style={{color: '#0A84FF', fontWeight: '600'}}>Kaydet</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Ad Soyad</Text>
              <TextInput
                style={styles.formInput}
                value={editDisplayName}
                onChangeText={setEditDisplayName}
                placeholder="Ad soyad girin"
                placeholderTextColor="#8E8E93"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Biyografi</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Kendinizden bahsedin..."
                placeholderTextColor="#8E8E93"
                multiline
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      
      {/* Save Outfit Modal */}
      <Modal
        visible={isSaveOutfitModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setIsSaveOutfitModalVisible(false)}
            >
              <X size={24} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Yeni Kombin Kaydet</Text>
            <TouchableOpacity onPress={handleCreateOutfit}>
              <Text style={{color: '#0A84FF', fontWeight: '600'}}>Kaydet</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.imagePickerContainer}
              onPress={handleSelectOutfitImage}
            >
              {newOutfitImage ? (
                <Image 
                  source={{ uri: newOutfitImage }} 
                  style={styles.selectedOutfitImage} 
                />
              ) : (
                <View style={[styles.selectedOutfitImage, {backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center'}]}>
                  <ImagePlus size={40} color="#8E8E93" />
                </View>
              )}
              <Text style={styles.imagePlaceholderText}>Kombin Görseli Seç</Text>
            </TouchableOpacity>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Kombin Adı</Text>
              <TextInput
                style={styles.formInput}
                value={newOutfitName}
                onChangeText={setNewOutfitName}
                placeholder="Kombininize bir isim verin"
                placeholderTextColor="#8E8E93"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Açıklama</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={newOutfitDesc}
                onChangeText={setNewOutfitDesc}
                placeholder="Kombininiz hakkında açıklama yazın..."
                placeholderTextColor="#8E8E93"
                multiline
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      
      {/* Settings Modal */}
      <Modal
        visible={isSettingsVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setIsSettingsVisible(false)}
            >
              <X size={24} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Ayarlar</Text>
            <View style={{width: 40}} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            <SettingsSection title="Hesap">
              <SettingItem 
                icon={<Edit size={20} color="#0A84FF" />}
                title="Profili Düzenle" 
                onPress={() => {
                  setIsSettingsVisible(false);
                  setTimeout(() => setIsEditProfileVisible(true), 300);
                }}
              />
              <SettingItem 
                icon={<Mail size={20} color="#FF9500" />}
                title="E-posta Adresini Değiştir" 
                onPress={() => Alert.alert('Bilgi', 'Bu özellik henüz kullanılabilir değil.')}
              />
              <SettingItem 
                icon={<FileText size={20} color="#FF2D55" />}
                title="Şifreni Değiştir" 
                onPress={() => Alert.alert('Bilgi', 'Bu özellik henüz kullanılabilir değil.')}
                showDivider={false}
              />
            </SettingsSection>
            
            <SettingsSection title="Uygulama">
              <SettingItem 
                icon={<CreditCard size={20} color="#30D158" />}
                title="Abonelik Yönetimi" 
                rightElement={
                  isPremium ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Premium</Text>
                    </View>
                  ) : (
                    <ChevronRight size={20} color="#C7C7CC" />
                  )
                }
                onPress={handleManageSubscription}
              />
              <SettingItem 
                icon={<Lightbulb size={20} color="#FFD60A" />}
                title="Kıyafet İpuçları" 
                onPress={() => setIsTipsModalVisible(true)}
              />
              <SettingItem 
                icon={<BookOpen size={20} color="#5E5CE6" />}
                title="Kullanım Koşulları" 
                onPress={() => handleOpenURL('https://example.com/terms')}
              />
              <SettingItem 
                icon={<Info size={20} color="#64D2FF" />}
                title="Hakkında" 
                rightElement={
                  <Text style={styles.versionInfoText}>v{Constants.expoConfig?.version || '1.0.0'}</Text>
                }
                showDivider={false}
              />
            </SettingsSection>
            
            <SettingsSection title="Diğer">
              <SettingItem 
                icon={<LogOut size={20} color="#FF3B30" />}
                title="Çıkış Yap" 
                onPress={() => {
                  Alert.alert(
                    'Çıkış Yap',
                    'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
                    [
                      { text: 'İptal', style: 'cancel' },
                      { 
                        text: 'Çıkış Yap', 
                        onPress: () => {
                          setIsSettingsVisible(false);
                          handleSignOut();
                        }, 
                        style: 'destructive' 
                      }
                    ]
                  );
                }}
                showDivider={false}
              />
            </SettingsSection>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      
      {/* Tips Modal */}
      <Modal
        visible={isTipsModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setIsTipsModalVisible(false)}
            >
              <X size={24} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Kıyafet İpuçları</Text>
            <View style={{width: 40}} />
          </View>
          
          <ScrollView style={styles.modalOverlay}>
            <View style={styles.modalScrollContent}>
              <View style={styles.tipSection}>
                <Text style={styles.tipTitle}>Renk Uyumu</Text>
                <Text style={styles.tipText}>
                  Kıyafetlerinizin renklerini seçerken renk çarkını düşünün. Tamamlayıcı renkler (çarkta karşılıklı olanlar) 
                  beraber giyildiğinde güzel bir kontrast oluşturur. Monokrom kombinler (aynı rengin farklı tonları) 
                  de şık ve zarif bir görünüm sunar.
                </Text>
                <View style={styles.exampleContainer}>
                  <View style={styles.imagePlaceholder} />
                  <Text style={styles.exampleCaption}>Örnek: Mavi-Turuncu renk uyumu</Text>
                </View>
              </View>
              
              <View style={styles.tipSection}>
                <Text style={styles.tipTitle}>Vücut Tipine Göre Giyinme</Text>
                <Text style={styles.tipText}>
                  Vücut tipinize uygun kıyafetler seçin. Elma vücut tipi için beli öne çıkaran kıyafetler, 
                  armut vücut tipi için üst kısmı vurgulayan kıyafetler, düz vücut tipi için kıvrımlar 
                  oluşturan parçalar tercih edilebilir.
                </Text>
              </View>
              
              <View style={styles.tipSection}>
                <Text style={styles.tipTitle}>Katmanlar Oluşturun</Text>
                <Text style={styles.tipText}>
                  Farklı parçaları üst üste giyerek boyut ve derinlik katın. Bir tişört üzerine gömlek veya hırka giymek, 
                  hem tarzınızı zenginleştirir hem de değişen hava koşullarına uyum sağlamanızı kolaylaştırır.
                </Text>
              </View>
              
              <View style={styles.tipSection}>
                <Text style={styles.tipTitle}>Doğru Beden</Text>
                <Text style={styles.tipText}>
                  Kıyafetlerin vücudunuza uygun bedende olması çok önemlidir. Çok büyük kıyafetler sizi daha kilolu gösterebilir, 
                  çok küçük kıyafetlerse rahatsızlık verir ve şık durmaz.
                </Text>
              </View>
              
              <View style={styles.tipSection}>
                <Text style={styles.tipTitle}>Aksesuarları Doğru Kullanın</Text>
                <Text style={styles.tipText}>
                  Takılar, çantalar, kemerler ve diğer aksesuarlar kombininizi tamamlar. Sade bir kıyafet dikkat 
                  çekici bir aksesuarla canlanabilir. Ancak aşırıya kaçmamaya dikkat edin - bazen "az çoktur" prensibi işe yarar.
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#000000',
    fontSize: 18,
  },
  profileHeader: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0,
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
    backgroundColor: '#F5F5F5',
  },
  profilePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitials: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0A84FF',
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
    borderColor: '#FFFFFF',
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
    paddingHorizontal: 40,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 5,
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
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  outfitsSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  addButton: {
    padding: 5,
  },
  outfitCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    borderTopColor: '#E5E5EA',
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
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 20,
    textAlign: 'center',
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
    padding: 16,
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
    fontWeight: '500',
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
  
  // Image picker styles
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
  
  // Logout section
  logoutSection: {
    padding: 20,
    marginBottom: 40,
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  outfitSharedStatus: {
    fontSize: 12,
    color: '#0A84FF',
    marginTop: 4,
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
});