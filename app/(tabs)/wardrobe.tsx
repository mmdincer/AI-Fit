import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import { Trash2, Eye, Image as ImageIcon, X, ShirtIcon, Layers, ChevronRight } from 'lucide-react-native';

const GENERATION_HISTORY_KEY = 'generationHistory';

interface HistoryItem {
  id: string;
  imageUri: string;
  timestamp: number;
  category?: string; // Optional category field
}

// Define outfit categories with emoji and name
interface OutfitCategory {
  id: string;
  emoji: string;
  name: string;
}

const OUTFIT_CATEGORIES: OutfitCategory[] = [
  { id: 'casual', emoji: '👚', name: 'Casual' },
  { id: 'work', emoji: '👨‍💼', name: 'Work' },
  { id: 'cozy', emoji: '🏡', name: 'Cozy' },
  { id: 'party', emoji: '🥳', name: 'Party' },
  { id: 'gym', emoji: '🏋️', name: 'Gym' },
  { id: 'datenight', emoji: '🌃', name: 'Date Night' },
  { id: 'occasion', emoji: '👠', name: 'Occasion' },
  { id: 'outdoor', emoji: '⛺', name: 'Outdoor' },
];

export default function WardrobeScreen() {
  const [activeTab, setActiveTab] = useState<'clothes' | 'outfits'>('outfits');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // --- Responsive Grid Calculation ---
  const screenWidth = Dimensions.get('window').width;
  const numColumns = useMemo(() => {
    const desiredItemWidth = 150; // Adjust this based on desired item size
    return Math.max(2, Math.floor(screenWidth / desiredItemWidth));
  }, [screenWidth]);
  const itemMargin = 6;
  const itemWidth = useMemo(() => {
      return (screenWidth - itemMargin * (numColumns + 1)) / numColumns;
  }, [screenWidth, numColumns, itemMargin]);
  // --- End Responsive Grid Calculation ---

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const historyString = await AsyncStorage.getItem(GENERATION_HISTORY_KEY);
      const loadedHistory = historyString ? JSON.parse(historyString) : [];
      // Optional: Verify file existence here if needed
      setHistory(loadedHistory);
    } catch (error) {
      console.error('Failed to load history:', error);
      Alert.alert('Error', 'Could not load creation history.');
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load history when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Wrap the async function call
      (async () => {
        await loadHistory();
      })();
      // Optional: Add a cleanup function here if needed
      // return () => console.log('Gallery screen unfocused');
    }, [loadHistory]) // Dependency array includes loadHistory
  );

  const deleteItem = async (idToDelete: string, uriToDelete: string) => {
    Alert.alert(
      'Delete Creation',
      'Are you sure you want to delete this image?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove from state
              const updatedHistory = history.filter(item => item.id !== idToDelete);
              setHistory(updatedHistory);

              // Remove from AsyncStorage
              await AsyncStorage.setItem(GENERATION_HISTORY_KEY, JSON.stringify(updatedHistory));

              // Delete the image file
              await FileSystem.deleteAsync(uriToDelete);
              console.log('Deleted image file:', uriToDelete);

              Alert.alert('Deleted', 'Image removed from history.');
            } catch (error) {
              console.error('Failed to delete item:', error);
              Alert.alert('Error', 'Could not delete the image.');
              // Optional: Reload history if delete failed partially
              loadHistory(); 
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: HistoryItem }) => (
    <View style={[styles.itemContainer, { width: itemWidth, height: itemWidth * 1.2 }]}>
      <TouchableOpacity 
          activeOpacity={0.8} 
          onPress={() => setSelectedImage(item.imageUri)} 
          style={styles.thumbnailTouchable}
      > 
          <Image 
              source={{ uri: item.imageUri }} 
              style={styles.thumbnail} 
              resizeMode="cover"
          />
      </TouchableOpacity>
      <View style={styles.itemInfo}>
          <Text style={styles.timestampText} numberOfLines={1}>
            {new Date(item.timestamp).toLocaleDateString()}
          </Text>
          <TouchableOpacity onPress={() => deleteItem(item.id, item.imageUri)} style={styles.deleteButton}>
            <Trash2 size={18} color="#FF453A" />
          </TouchableOpacity>
      </View>
    </View>
  );

  // Filter outfits by category when a category is selected
  const filteredOutfits = useMemo(() => {
    if (!selectedCategory) return history;
    return history.filter(item => item.category === selectedCategory);
  }, [history, selectedCategory]);

  // Render category list item
  const renderCategoryItem = ({ item }: { item: OutfitCategory }) => (
    <TouchableOpacity 
      style={styles.categoryItem}
      onPress={() => setSelectedCategory(item.id)}
    >
      <View style={styles.categoryRow}>
        <Text style={styles.categoryEmoji}>{item.emoji}</Text>
        <Text style={styles.categoryName}>{item.name}</Text>
        <View style={styles.categoryRightArrow}>
          <ChevronRight size={20} color="#8E8E93" />
          <Text style={styles.viewAllText}>View all</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderOutfitCategoriesList = () => {
    return (
      <FlatList
        data={OUTFIT_CATEGORIES}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.categoriesListContainer}
      />
    );
  };

  const renderCategoryOutfits = () => {
    if (filteredOutfits.length === 0) {
      return (
        <View style={styles.content}>
          <Layers size={64} color="#48484A" style={{ marginBottom: 20 }}/>
          <Text style={styles.placeholderText}>No Outfits in This Category</Text>
          <Text style={styles.placeholderSubText}>Create outfits and assign them to this category!</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={styles.backButtonText}>Back to Categories</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.categoryOutfitsContainer}>
        <TouchableOpacity 
          style={styles.backButtonTop}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={styles.backButtonText}>← Back to Categories</Text>
        </TouchableOpacity>
        <FlatList
          data={filteredOutfits}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContentContainer}
          numColumns={numColumns}
          key={numColumns}
        />
      </View>
    );
  };

  const renderOutfitsTab = () => {
    if (isLoading) {
      return <View style={styles.content}><ActivityIndicator size="large" color="#0A84FF" /></View>;
    }
    
    if (history.length === 0) {
      return (
        <View style={styles.content}>
          <Layers size={64} color="#48484A" style={{ marginBottom: 20 }}/>
          <Text style={styles.placeholderText}>No Outfits Yet</Text>
          <Text style={styles.placeholderSubText}>Go to the Home tab, create an outfit, and save it to your wardrobe!</Text>
        </View>
      );
    }
    
    if (selectedCategory) {
      return renderCategoryOutfits();
    } else {
      return renderOutfitCategoriesList();
    }
  };

  const renderClothesTab = () => {
    return (
      <View style={styles.content}>
        <ShirtIcon size={64} color="#48484A" style={{ marginBottom: 20 }}/>
        <Text style={styles.placeholderText}>No Clothes Yet</Text>
        <Text style={styles.placeholderSubText}>You can add individual clothing items to mix and match.</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'clothes' && styles.activeTab]}
          onPress={() => setActiveTab('clothes')}
        >
          <ShirtIcon size={20} color={activeTab === 'clothes' ? '#0A84FF' : '#8E8E93'} style={styles.tabIcon} />
          <Text style={[styles.tabText, activeTab === 'clothes' && styles.activeTabText]}>Clothes</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'outfits' && styles.activeTab]}
          onPress={() => setActiveTab('outfits')}
        >
          <Layers size={20} color={activeTab === 'outfits' ? '#0A84FF' : '#8E8E93'} style={styles.tabIcon} />
          <Text style={[styles.tabText, activeTab === 'outfits' && styles.activeTabText]}>Outfits</Text>
        </TouchableOpacity>
      </View>

      {/* Content based on active tab */}
      {activeTab === 'clothes' ? renderClothesTab() : renderOutfitsTab()}
      
      {/* Full Screen Image Modal */}
      <Modal
        animationType="fade"
        transparent={false}
        visible={!!selectedImage}
        onRequestClose={() => setSelectedImage(null)}
        statusBarTranslucent={true}
      >
        <SafeAreaView style={styles.fullScreenContainer}>
          {selectedImage && (
            <Image 
              source={{ uri: selectedImage }} 
              style={styles.fullScreenImage} 
              resizeMode="contain"
            />
          )}
          <TouchableOpacity 
            style={styles.fullScreenCloseButton} 
            onPress={() => setSelectedImage(null)}
          >
            <X size={24} color="#000000" />
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
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
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0A84FF',
  },
  tabIcon: {
    marginRight: 5,
  },
  tabText: {
    color: '#8E8E93',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#0A84FF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#555555',
    textAlign: 'center',
    marginBottom: 10,
  },
  placeholderSubText: {
    fontSize: 14,
    color: '#777777',
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  listContentContainer: {
    paddingHorizontal: 3,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  itemContainer: {
    margin: 3,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  thumbnailTouchable: {
     flex: 1,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E0E0E0',
  },
  itemInfo: {
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between', 
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(248, 248, 248, 0.85)',
  },
  timestampText: {
    fontSize: 11,
    color: '#333333',
    flexShrink: 1,
    marginRight: 5,
  },
  deleteButton: {
    padding: 4,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  fullScreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    resizeMode: 'contain',
  },
  fullScreenCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    left: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 10,
    borderRadius: 22,
    zIndex: 10,
  },
  // Category styles
  categoriesListContainer: {
    paddingTop: 10,
    paddingBottom: 30,
  },
  categoryItem: {
    paddingVertical: 18,
    paddingHorizontal: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryEmoji: {
    fontSize: 24,
    marginRight: 15,
  },
  categoryName: {
    fontSize: 17,
    fontWeight: '500',
    color: '#333333',
    flex: 1,
  },
  categoryRightArrow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#8E8E93',
    marginRight: 5,
  },
  categoryOutfitsContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
  },
  backButtonTop: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  backButtonText: {
    color: '#0A84FF',
    fontWeight: '500',
    fontSize: 15,
  },
}); 