import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useProfileStore, ProfileData, SavedOutfit } from '../store/profileStore';
import { X, MessageCircle, User, ChevronLeft } from 'lucide-react-native';
import { useSocialStore } from '../store/socialStore';

export default function FriendProfileScreen() {
  // Get friend ID from URL params
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;
  
  // Get the cached profile data from the profile store
  const getCachedProfile = useProfileStore(state => state.getCachedProfile);
  const friendProfile = getCachedProfile(id as string);
  
  // Get the friend's data from social store to enable messaging
  const { friends, markMessagesAsRead } = useSocialStore();
  const friend = friends.find(f => f.id === id);
  
  // Open chat with this friend
  const handleChat = () => {
    if (friend) {
      // Mark messages as read first
      markMessagesAsRead(friend.id);
      
      // Navigate back to social tab with a message to open chat
      router.push({
        pathname: '/(tabs)/social',
        params: { openChat: friend.id }
      });
    }
  };
  
  // If no profile data is found, show an error
  if (!friendProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profil</Text>
          <View style={styles.rightButton} />
        </View>
        
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyTitle}>Profil Bulunamadı</Text>
          <Text style={styles.emptyText}>Bu kullanıcının profil bilgisi bulunamadı.</Text>
          <TouchableOpacity
            style={styles.backToSocialButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backToSocialText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  const OutfitCard = ({ outfit }: { outfit: SavedOutfit }) => (
    <View style={styles.outfitCard}>
      <Image 
        source={{ uri: outfit.imageUrl }} 
        style={styles.outfitImage}
        defaultSource={require('@/assets/images/outfit-placeholder.png')} 
      />
      <View style={styles.outfitInfo}>
        <Text style={styles.outfitName}>{outfit.name}</Text>
        <Text style={styles.outfitDescription} numberOfLines={1}>
          {outfit.description}
        </Text>
      </View>
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil</Text>
        {friend && (
          <TouchableOpacity
            style={styles.chatButton}
            onPress={handleChat}
          >
            <MessageCircle size={22} color="#0A84FF" />
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView style={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profilePictureContainer}>
            {friendProfile.profilePicture ? (
              <Image 
                source={{ uri: friendProfile.profilePicture }} 
                style={styles.profilePicture} 
              />
            ) : (
              <View style={styles.profilePlaceholder}>
                <User size={24} color="#8E8E93" />
              </View>
            )}
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>{friendProfile.displayName}</Text>
            <Text style={styles.bio}>{friendProfile.bio}</Text>
            
            <View style={styles.profileStats}>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{friendProfile.savedOutfits.length}</Text>
                <Text style={styles.statLabel}>Kıyafetler</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{friendProfile.publicOutfitCount}</Text>
                <Text style={styles.statLabel}>Herkese Açık</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Outfits */}
        <View style={styles.outfitsSection}>
          <Text style={styles.sectionTitle}>Herkese Açık Kıyafetler</Text>
          
          {friendProfile.savedOutfits && friendProfile.savedOutfits.length > 0 ? (
            friendProfile.savedOutfits
              .filter(outfit => outfit.isPublic)
              .map((outfit) => (
                <OutfitCard key={outfit.id} outfit={outfit} />
              ))
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyText}>Herkese açık kıyafet bulunamadı</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  backButton: {
    padding: 8,
  },
  chatButton: {
    padding: 8,
  },
  rightButton: {
    width: 40,
  },
  content: {
    flex: 1,
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
    color: '#333333',
    marginBottom: 20,
    textAlign: 'center',
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'center',
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
    color: '#333333',
  },
  outfitsSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 15,
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
    backgroundColor: '#EEEEEE',
  },
  outfitInfo: {
    padding: 15,
  },
  outfitName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 5,
  },
  outfitDescription: {
    fontSize: 14,
    color: '#333333',
  },
  emptyStateContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
    marginBottom: 20,
  },
  backToSocialButton: {
    backgroundColor: '#0A84FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backToSocialText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});