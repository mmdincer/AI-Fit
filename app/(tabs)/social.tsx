import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  Modal,
  SafeAreaView,
  Alert,
  ScrollView,
} from 'react-native';
import { useSocialStore, Friend, FriendRequest, Message } from '../../store/socialStore';
import { useAuth } from '@/hooks/useAuth';
import { useProfileStore, SavedOutfit } from '../../store/profileStore';
import { UserPlus, Search, MessageCircle, X, ChevronRight, Bell, Check, User, Send, Image as ImageIcon, Share2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function SocialScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'messages'>('messages');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddFriendVisible, setIsAddFriendVisible] = useState(false);
  const [isMessageModalVisible, setIsMessageModalVisible] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messageText, setMessageText] = useState('');
  const [messageImage, setMessageImage] = useState<string | null>(null);
  const [, forceUpdate] = useState({});
  
  // Social store'dan verileri al
  const { 
    friends, 
    friendRequests, 
    messages,
    addFriend,
    removeFriend,
    acceptFriendRequest,
    rejectFriendRequest,
    sendMessage,
    markMessagesAsRead,
    getUnreadMessageCount
  } = useSocialStore();
  
  // Profil store'dan verileri al
  const { myProfile, shareOutfitWithFriend } = useProfileStore();
  
  const router = useRouter();
  const params = useLocalSearchParams();
  const openChatId = params.openChat as string | undefined;
  
  // Örnek arkadaş ve mesajları oluştur (ilk yüklemede)
  useEffect(() => {
    // Örnek arkadaşı ekle (eğer zaten eklenmemişse)
    if (friends.length === 0) {
      const exampleFriend: Friend = {
        id: 'example-friend-1',
        name: 'Ayşe Yılmaz',
        email: 'ayse.yilmaz@example.com',
        profilePicture: null
      };
      
      addFriend(exampleFriend);
      
      // Örnek mesaj gönder
      setTimeout(() => {
        const welcomeMessage: Message = {
          id: 'msg-welcome-1',
          senderId: 'example-friend-1',
          receiverId: user?.id || 'current-user',
          content: 'Merhaba! Beni arkadaş olarak ekledin. Benimle kıyafetlerini paylaşabilirsin!',
          timestamp: Date.now() - 3600000, // 1 saat önce
          isRead: false
        };
        
        sendMessage('example-friend-1', welcomeMessage);
      }, 1000);
    }
  }, []);
  
  // Check if we need to open a chat with a specific friend (when returning from profile page)
  useEffect(() => {
    if (openChatId) {
      const friendToOpen = friends.find(f => f.id === openChatId);
      if (friendToOpen) {
        setTimeout(() => {
          handleOpenChat(friendToOpen);
        }, 300); // Small delay to ensure component is fully rendered
      }
    }
  }, [friends, openChatId]);
  
  // Make sure all unread messages can be properly seen
  useEffect(() => {
    // Force a re-render to ensure unread messages are displayed properly
    const timer = setTimeout(() => {
      // This is a no-op update that will trigger a re-render
      forceUpdate({});
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  const handleAddFriend = () => {
    // Burada normalde bir API isteği yapılacak, şimdilik manuel ekliyoruz
    if (searchQuery.trim() === '') {
      Alert.alert('Error', 'Please enter a valid email or username');
      return;
    }
    
    // Friend objesi oluştur
    const newFriend: Friend = {
      id: 'temp-' + Date.now(),
      name: searchQuery.includes('@') ? searchQuery.split('@')[0] : searchQuery,
      email: searchQuery.includes('@') ? searchQuery : `${searchQuery}@example.com`,
      profilePicture: null,
      isRequestPending: true
    };
    
    addFriend(newFriend);
    setSearchQuery('');
    setIsAddFriendVisible(false);
    
    Alert.alert('Success', 'Friend request sent');
  };
  
  const handleOpenChat = (friend: Friend) => {
    setSelectedFriend(friend);
    // Mark messages as read when opening chat
    markMessagesAsRead(friend.id);
    setIsMessageModalVisible(true);
  };
  
  // Navigate to friend profile page with the ID
  const handleViewProfile = (friend: Friend) => {
    // Store friend's profile data in the store cache before navigating
    const friendProfile = {
      userId: friend.id,
      displayName: friend.name,
      bio: "Merhaba! Ben " + friend.name + ".",
      profilePicture: friend.profilePicture,
      savedOutfits: [
        {
          id: 'outfit-example-1',
          name: 'Yaz Kombini',
          imageUrl: 'https://example.com/outfit1.jpg',
          description: 'Yazlık günlük kombin',
          createdAt: Date.now() - 86400000, // 1 gün önce
          isPublic: true
        },
        {
          id: 'outfit-example-2',
          name: 'Ofis Stili',
          imageUrl: 'https://example.com/outfit2.jpg',
          description: 'Profesyonel iş kıyafeti',
          createdAt: Date.now() - 172800000, // 2 gün önce
          isPublic: true
        }
      ],
      publicOutfitCount: 2,
    };
    
    // Profil store'dan cacheProfile fonksiyonunu alalım
    const { cacheProfile } = useProfileStore.getState();
    
    // Cache the profile in the store
    cacheProfile(friend.id, friendProfile);
    
    // Navigate to friend profile page with the ID
    router.push({
      pathname: "/friend-profile" as any,
      params: { id: friend.id }
    });
  };
  
  const handleSendMessage = () => {
    if (!selectedFriend || (!messageText.trim() && !messageImage)) return;
    
    // Mesaj objesi oluştur
    const newMessage: Message = {
      id: 'msg-' + Date.now(),
      senderId: user?.id || 'current-user',
      receiverId: selectedFriend.id,
      content: messageText.trim(),
      imageUrl: messageImage,
      timestamp: Date.now(),
      isRead: true
    };
    
    sendMessage(selectedFriend.id, newMessage);
    setMessageText('');
    setMessageImage(null);
  };
  
  const handleSelectImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow gallery access to select photos');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setMessageImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
    }
  };
  
  // Kıyafet paylaşım işlevini ekleyelim
  const handleShareOutfit = (outfitId: string) => {
    if (!selectedFriend) return;
    
    // ProfileStore'daki paylaşım fonksiyonunu çağır
    shareOutfitWithFriend(outfitId, selectedFriend.id);
    
    // Paylaşım hakkında bir mesaj gönder
    const outfit = myProfile?.savedOutfits.find(o => o.id === outfitId);
    if (outfit) {
      const shareMessage: Message = {
        id: 'msg-' + Date.now(),
        senderId: user?.id || 'current-user',
        receiverId: selectedFriend.id,
        content: `"${outfit.name}" adlı kıyafeti seninle paylaştım!`,
        imageUrl: outfit.imageUrl,
        timestamp: Date.now(),
        isRead: true
      };
      
      sendMessage(selectedFriend.id, shareMessage);
    }
  };

  // Arkadaşın kıyafetlerini göstermek için modal ekliyoruz
  const [isShowOutfitsModalVisible, setIsShowOutfitsModalVisible] = useState(false);
  const [friendOutfits, setFriendOutfits] = useState<SavedOutfit[]>([]);
  
  const showFriendOutfits = () => {
    if (!selectedFriend) return;
    
    // Kullanıcının profil sayfasından kıyafetlerini al
    // Gerçek bir uygulamada bunu bir API'den çekersiniz
    // Şimdilik örnek kıyafetler oluşturalım
    const exampleOutfits: SavedOutfit[] = [
      {
        id: 'outfit-example-1',
        name: 'Yaz Kombini',
        imageUrl: 'https://example.com/outfit1.jpg', // Gerçek bir URL olmadığı için görüntülenmeyecek
        description: 'Yazlık günlük kombin',
        createdAt: Date.now() - 86400000, // 1 gün önce
        isPublic: true
      },
      {
        id: 'outfit-example-2',
        name: 'Ofis Stili',
        imageUrl: 'https://example.com/outfit2.jpg', // Gerçek bir URL olmadığı için görüntülenmeyecek
        description: 'Profesyonel iş kıyafeti',
        createdAt: Date.now() - 172800000, // 2 gün önce
        isPublic: true
      }
    ];
    
    setFriendOutfits(exampleOutfits);
    setIsShowOutfitsModalVisible(true);
  };
  
  const renderFriendItem = ({ item }: { item: Friend }) => {
    const unreadCount = getUnreadMessageCount(item.id);
    
    return (
      <TouchableOpacity 
        style={styles.friendItem}
        onPress={() => {
          // Show action sheet to either chat or view profile
          Alert.alert(
            item.name,
            'Ne yapmak istersiniz?',
            [
              {
                text: 'Mesaj Gönder',
                onPress: () => handleOpenChat(item)
              },
              {
                text: 'Profili Görüntüle',
                onPress: () => handleViewProfile(item)
              },
              {
                text: 'İptal',
                style: 'cancel'
              }
            ]
          );
        }}
      >
        {item.profilePicture ? (
          <Image source={{ uri: item.profilePicture }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <User size={20} color="#FFFFFF" />
          </View>
        )}
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{item.name}</Text>
          <Text style={styles.friendEmail}>{item.email}</Text>
        </View>
        <View style={styles.friendAction}>
          {unreadCount > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{unreadCount}</Text>
            </View>
          ) : (
            <MessageCircle size={22} color="#0A84FF" />
          )}
        </View>
      </TouchableOpacity>
    );
  };
  
  const renderRequestItem = ({ item }: { item: FriendRequest }) => (
    <View style={styles.requestItem}>
      {item.senderProfilePicture ? (
        <Image source={{ uri: item.senderProfilePicture }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <User size={20} color="#FFFFFF" />
        </View>
      )}
      <View style={styles.requestInfo}>
        <Text style={styles.requestName}>{item.senderName}</Text>
        <Text style={styles.requestEmail}>{item.senderEmail}</Text>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity 
          style={[styles.requestAction, styles.acceptAction]}
          onPress={() => acceptFriendRequest(item.id, {
            id: item.senderId,
            name: item.senderName,
            email: item.senderEmail,
            profilePicture: item.senderProfilePicture
          })}
        >
          <Check size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.requestAction, styles.rejectAction]}
          onPress={() => rejectFriendRequest(item.id)}
        >
          <X size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
  
  const renderMessageItem = ({ item }: { item: Friend }) => {
    // Arkadaşla olan son mesajı bul
    const friendMessages = messages[item.id] || [];
    const lastMessage = friendMessages.length > 0 
      ? friendMessages[friendMessages.length - 1] 
      : null;
    const unreadCount = getUnreadMessageCount(item.id);
    const hasUnread = unreadCount > 0;
    
    return (
      <View style={[styles.messageThread, hasUnread ? {backgroundColor: '#E0F0FF'} : null]}>
        <TouchableOpacity 
          onPress={() => handleViewProfile(item)}
        >
          {item.profilePicture ? (
            <Image source={{ uri: item.profilePicture }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <User size={20} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={{flex: 1, flexDirection: 'row', marginLeft: 15}}
          onPress={() => handleOpenChat(item)}
        >
          <View style={{flex: 1}}>
            <Text style={[styles.threadName, hasUnread ? {fontWeight: '700'} : null]}>
              {item.name}
            </Text>
            {lastMessage ? (
              <Text 
                style={[
                  styles.lastMessage, 
                  hasUnread ? {color: '#000000', fontWeight: '600'} : null
                ]}
                numberOfLines={1}
              >
                {lastMessage.imageUrl ? '📷 Photo' : lastMessage.content || '<No message>'}
              </Text>
            ) : (
              <Text style={styles.lastMessage}>Start a conversation</Text>
            )}
          </View>
          
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
          onPress={() => setActiveTab('messages')}
        >
          <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBadgeContainer, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>Requests</Text>
          {friendRequests.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{friendRequests.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.addButtonSmall}
          onPress={() => setIsAddFriendVisible(true)}
        >
          <UserPlus size={22} color="#0A84FF" />
        </TouchableOpacity>
      </View>
      
      {/* Content based on active tab */}
      {activeTab === 'requests' && (
        friendRequests.length > 0 ? (
          <FlatList
            data={friendRequests}
            renderItem={renderRequestItem}
            keyExtractor={(item) => item.id}
            style={styles.list}
          />
        ) : (
          <View style={styles.emptyState}>
            <Bell size={60} color="#3A3A3C" />
            <Text style={styles.emptyTitle}>No Friend Requests</Text>
            <Text style={styles.emptyText}>When someone adds you, you'll see it here</Text>
          </View>
        )
      )}
      
      {activeTab === 'messages' && (
        friends.length > 0 ? (
          <FlatList
            data={friends}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item.id}
            style={styles.list}
          />
        ) : (
          <View style={styles.emptyState}>
            <MessageCircle size={60} color="#3A3A3C" />
            <Text style={styles.emptyTitle}>No Messages</Text>
            <Text style={styles.emptyText}>Add friends to start messaging</Text>
          </View>
        )
      )}
      
      {/* Add Friend Modal */}
      <Modal
        visible={isAddFriendVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddFriendVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setIsAddFriendVisible(false)}
            >
              <ChevronRight size={24} color="#000000" style={{transform: [{rotate: '180deg'}]}} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Friend</Text>
            <View style={{width: 40}} />
          </View>
          
          <View style={styles.modalContent}>
            <Text style={styles.modalSubtitle}>
              Enter your friend's email or username
            </Text>
            
            <View style={styles.searchContainer}>
              <Search size={20} color="#8E8E93" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Email or username"
                placeholderTextColor="#8E8E93"
                autoCapitalize="none"
              />
            </View>
            
            <TouchableOpacity
              style={styles.addFriendButton}
              onPress={handleAddFriend}
            >
              <Text style={styles.addFriendButtonText}>Send Friend Request</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
      
      {/* Message Modal */}
      <Modal
        visible={isMessageModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setIsMessageModalVisible(false);
          setSelectedFriend(null);
          setMessageText('');
          setMessageImage(null);
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setIsMessageModalVisible(false);
                setSelectedFriend(null);
                setMessageText('');
                setMessageImage(null);
              }}
            >
              <ChevronRight size={24} color="#000000" style={{transform: [{rotate: '180deg'}]}} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedFriend?.name || 'Chat'}
            </Text>
            <View style={{width: 40}} />
          </View>
          
          <ScrollView style={styles.chatContainer}>
            {selectedFriend && messages[selectedFriend.id]?.map((msg) => (
              <View 
                key={msg.id}
                style={[
                  styles.messageBubble,
                  msg.senderId === user?.id ? styles.sentMessage : styles.receivedMessage
                ]}
              >
                {msg.imageUrl && (
                  <Image source={{ uri: msg.imageUrl }} style={styles.messageImage} />
                )}
                {msg.content && (
                  <Text style={styles.messageText}>{msg.content}</Text>
                )}
                <Text style={styles.messageTime}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))}
            
            {selectedFriend && (!messages[selectedFriend.id] || messages[selectedFriend.id].length === 0) && (
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatText}>No messages yet</Text>
                <Text style={styles.emptyChatSubtext}>Start the conversation with {selectedFriend.name}</Text>
              </View>
            )}
          </ScrollView>
          
          {messageImage && (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: messageImage }} style={styles.imagePreview} />
              <TouchableOpacity 
                style={styles.removeImageButton}
                onPress={() => setMessageImage(null)}
              >
                <X size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.messageInputContainer}>
            <TouchableOpacity 
              style={styles.attachButton}
              onPress={handleSelectImage}
            >
              <ImageIcon size={24} color="#0A84FF" />
            </TouchableOpacity>
            <TextInput
              style={styles.messageInput}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type a message..."
              placeholderTextColor="#8E8E93"
              multiline={true}
            />
            <TouchableOpacity 
              style={[
                styles.sendButton,
                (!messageText.trim() && !messageImage) && styles.sendButtonDisabled
              ]}
              onPress={handleSendMessage}
              disabled={!messageText.trim() && !messageImage}
            >
              <Send size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
      
      {/* Kıyafet Paylaşım Modal */}
      <Modal
        visible={isShowOutfitsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsShowOutfitsModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Kıyafet Paylaş</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsShowOutfitsModalVisible(false)}
            >
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalSubtitle}>
              {selectedFriend?.name} ile paylaşmak istediğiniz kıyafeti seçin:
            </Text>
            
            {myProfile?.savedOutfits && myProfile.savedOutfits.length > 0 ? (
              myProfile.savedOutfits.map((outfit) => (
                <View key={outfit.id} style={styles.outfitShareItem}>
                  <Image 
                    source={{ uri: outfit.imageUrl }} 
                    style={styles.outfitShareImage} 
                    defaultSource={require('@/assets/images/outfit-placeholder.png')}
                  />
                  <View style={styles.outfitShareInfo}>
                    <Text style={styles.outfitShareName}>{outfit.name}</Text>
                    <Text style={styles.outfitShareDescription} numberOfLines={1}>
                      {outfit.description}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.outfitShareButton}
                    onPress={() => {
                      handleShareOutfit(outfit.id);
                      setIsShowOutfitsModalVisible(false);
                      Alert.alert(
                        'Kıyafet Paylaşıldı',
                        `"${outfit.name}" kıyafeti ${selectedFriend?.name} ile paylaşıldı!`
                      );
                    }}
                  >
                    <Share2 size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>Kaydedilmiş kıyafetiniz bulunmuyor</Text>
                <TouchableOpacity 
                  style={styles.createButton}
                  onPress={() => {
                    setIsShowOutfitsModalVisible(false);
                    router.push('/');
                  }}
                >
                  <Text style={styles.createButtonText}>Kıyafet Oluştur</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tabBadgeContainer: {
    flex: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0A84FF',
  },
  tabText: {
    color: '#8E8E93',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#0A84FF',
  },
  addButtonSmall: {
    padding: 10,
    marginLeft: 5,
  },
  tabBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  friendInfo: {
    flex: 1,
    marginLeft: 15,
  },
  friendName: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
  },
  friendEmail: {
    color: '#8E8E93',
    fontSize: 14,
  },
  friendAction: {
    marginLeft: 10,
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  requestInfo: {
    flex: 1,
    marginLeft: 15,
  },
  requestName: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
  },
  requestEmail: {
    color: '#8E8E93',
    fontSize: 14,
  },
  requestActions: {
    flexDirection: 'row',
  },
  requestAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  acceptAction: {
    backgroundColor: '#34C759',
  },
  rejectAction: {
    backgroundColor: '#FF3B30',
  },
  messageThread: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  avatarContainer: {
    marginRight: 15,
  },
  messageInfoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messageInfo: {
    flex: 1,
  },
  threadName: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
  },
  lastMessage: {
    color: '#8E8E93',
    fontSize: 14,
  },
  unreadText: {
    color: '#000000',
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyTitle: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 16,
    textAlign: 'center',
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
    backgroundColor: '#FFFFFF',
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
    padding: 20,
  },
  modalSubtitle: {
    color: '#000000',
    fontSize: 16,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#000000',
    fontSize: 16,
    paddingVertical: 15,
  },
  addFriendButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  addFriendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Chat styles
  backButton: {
    padding: 5,
  },
  outfitsButton: {
    padding: 8,
  },
  headerRight: {
    width: 24,
  },
  chatContainer: {
    flex: 1,
    padding: 15,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 20,
    marginBottom: 10,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#0A84FF',
    borderTopRightRadius: 5,
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#0A84FF',
    borderTopLeftRadius: 5,
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 8,
  },
  messageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyChatText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptyChatSubtext: {
    color: '#8E8E93',
    fontSize: 16,
    textAlign: 'center',
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0.5,
    borderTopColor: '#E0E0E0',
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    color: '#000000',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#0A84FF',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#0A84FF',
    opacity: 1,
  },
  imagePreviewContainer: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    position: 'relative',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outfitShareItem: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    padding: 12,
    alignItems: 'center',
  },
  outfitShareImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
  },
  outfitShareInfo: {
    flex: 1,
    marginLeft: 15,
  },
  outfitShareName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 5,
  },
  outfitShareDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  outfitShareButton: {
    backgroundColor: '#0A84FF',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  createButton: {
    backgroundColor: '#0A84FF',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});