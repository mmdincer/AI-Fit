import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Platform,
  FlatList,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CirclePlus, Share, Download, Bookmark, X, RefreshCcw, Archive, Tag } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleGenAI, Modality } from "@google/genai";
import { router } from 'expo-router';
import ModelSelectorModal from './ModelSelectorModal';
import Toast from 'react-native-toast-message';

// Gemini API Key (using the same from index.tsx)
const GEMINI_API_KEY = "AIzaSyAWZzdckiekff9n3BrUpq-zKLXNaraZF3U";

// Shared AsyncStorage keys
const GENERATION_HISTORY_KEY = 'generationHistory';
const SAVED_MODELS_KEY = 'savedBodyModels';
const SAVE_COUNT_KEY = 'successful_saves_count';
const RATING_REQUESTED_KEY = 'rating_requested';

type Category = 'shirt' | 'dress' | 'pants' | 'outfit';

interface TryOnItem {
  category: Category;
  image: string | null;
  label: string;
  emoji: string;
  position: {
    top: string | number;
    left?: string | number;
    right?: string | number;
  };
}

// Convert local URI to base64 (copied from index.tsx)
async function localUriToBase64(uri: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    console.error('Error converting local URI to base64:', error);
    throw error;
  }
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

const VirtualTryOn = () => {
  const [bodyImage, setBodyImage] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<{[key in Category]?: string | null}>({});
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFullScreenImage, setShowFullScreenImage] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [isModelSelectorVisible, setIsModelSelectorVisible] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [imageToSave, setImageToSave] = useState<string | null>(null);

  useEffect(() => {
    checkUsageCount();
    requestPermissions();
  }, []);

  const checkUsageCount = async () => {
    try {
      const count = await AsyncStorage.getItem('usageCount');
      setUsageCount(count ? parseInt(count, 10) : 0);
    } catch (error) {
      console.error('Error checking usage count:', error);
    }
  };

  const incrementUsageCount = async () => {
    try {
      const newCount = usageCount + 1;
      await AsyncStorage.setItem('usageCount', newCount.toString());
      setUsageCount(newCount);
      return newCount;
    } catch (error) {
      console.error('Error updating usage count:', error);
      return usageCount + 1;
    }
  };
  
  const tryOnItems: TryOnItem[] = [
    { 
      category: 'shirt', 
      image: null, 
      label: 'SHIRT', 
      emoji: '👕',
      position: { top: '30%', left: '15%' }
    },
    { 
      category: 'dress', 
      image: null, 
      label: 'DRESS', 
      emoji: '👗',
      position: { top: '40%', right: '15%' }
    },
    { 
      category: 'pants', 
      image: null, 
      label: 'PANTS', 
      emoji: '👖',
      position: { top: '70%', left: '15%' }
    }
  ];

  const requestPermissions = async () => {
    try {
      const { status: mediaLibraryStatus } = await MediaLibrary.requestPermissionsAsync();
      const { status: mediaLibraryAccessStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (mediaLibraryAccessStatus !== 'granted') {
        Alert.alert('Permission needed', 'Please allow gallery access to select photos');
      }
      
      if (cameraStatus !== 'granted') {
        Alert.alert('Permission needed', 'Please allow camera access to take photos');
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  const selectBodyImage = async () => {
    try {
      await requestPermissions();
      
      const options: ImagePicker.ImagePickerOptions = {
        allowsEditing: false,
        quality: 0.8,
      };

      const result = await ImagePicker.launchImageLibraryAsync(options);
      
      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].uri) {
        setBodyImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image selection error:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const selectItemImage = async (category: Category) => {
    try {
      await requestPermissions();
      
      const options: ImagePicker.ImagePickerOptions = {
        allowsEditing: false,
        quality: 0.8,
      };

      const result = await ImagePicker.launchImageLibraryAsync(options);
      
      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].uri) {
        setSelectedItems({
          ...selectedItems,
          [category]: result.assets[0].uri
        });
      }
    } catch (error) {
      console.error('Image selection error:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const resetTryOn = () => {
    Alert.alert(
      'Reset Try-On',
      'Are you sure you want to reset? This will clear your current image.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            setBodyImage(null);
            setSelectedItems({});
            setResultImage(null);
            Toast.show({
              type: 'info',
              text1: 'Reset Complete',
              position: 'bottom',
              visibilityTime: 1500,
            });
          }
        }
      ]
    );
  };

  const showSavedModels = async () => {
    setIsModelSelectorVisible(true);
  };

  const handleModelSelected = (uri: string) => {
    setBodyImage(uri);
  };

  const generateImage = async () => {
    if (!bodyImage) {
      Alert.alert('Missing Image', 'Please upload a body image first');
      return;
    }

    const selectedCount = Object.values(selectedItems).filter(Boolean).length;
    if (selectedCount === 0) {
      Alert.alert('Missing Items', 'Please select at least one clothing item');
      return;
    }

    // Premium limit check
    const newCount = await incrementUsageCount();
    if (newCount > 500) {
      const isPremium = await AsyncStorage.getItem('isPremium');
      if (isPremium !== 'true') {
        Alert.alert(
          'Free Tier Limit Reached',
          'You\'ve reached the limit of 50 free generations. Upgrade to premium for unlimited generations.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Subscribe', onPress: () => router.push('/subscription') }
          ]
        );
        return;
      }
    }

    setIsGenerating(true);

    try {
      console.log('Starting image generation with Google Gemini API...');
      
      console.log('Processing body image for Gemini...');
      const humanImageBase64 = await localUriToBase64(bodyImage);
      
      const selectedGarment = Object.values(selectedItems).find(Boolean);
      if (!selectedGarment) {
        throw new Error('No garment selected');
      }
      
      console.log('Processing garment image for Gemini...');
      const garmentImageBase64 = await localUriToBase64(selectedGarment);
      
      console.log('Preparing Gemini API request...');
      
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY }); 

      const userPrompt = "Take the first image as the base: it shows a human body in a neutral standing pose. Then take the second image: it is a clothing item (e.g., a dress/shirt/pants). Please digitally dress the person from the first image with the clothing from the second image in a realistic way. Ensure that the proportions match the body, and the clothing appears naturally worn with proper shadows, wrinkles, and perspective. Avoid any distortion. Keep the background simple or transparent if possible. The final output should look like the person is actually wearing the outfit.";

      const contents = [
        { text: userPrompt },
        { inlineData: { mimeType: "image/jpeg", data: humanImageBase64 } },
        { inlineData: { mimeType: "image/jpeg", data: garmentImageBase64 } },
      ];
      
      console.log('Sending Gemini API request using gemini-2.0-flash-preview-image-generation model...');
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash-preview-image-generation",
        contents: contents,
        config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT]
        }
      });
      
      console.log('Gemini API response received.');

      if (result && result.candidates && result.candidates.length > 0) {
        const candidate = result.candidates[0];
        if (candidate.content && candidate.content.parts) {
          let imageFound = false;
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.data) {
              console.log('Image data found in Gemini response.');
              const base64ImageData = part.inlineData.data;
              
              const filename = `gemini-output-${Date.now()}.jpeg`;
              const tempImageUri = `${FileSystem.cacheDirectory}${filename}`;
              
              console.log(`Saving Gemini output to temporary file: ${tempImageUri}`);
              await FileSystem.writeAsStringAsync(tempImageUri, base64ImageData, {
                encoding: FileSystem.EncodingType.Base64,
              });
              console.log('Gemini output saved successfully.');
              
              setResultImage(tempImageUri);
              setShowFullScreenImage(true);
              imageFound = true;
              
              setImageToSave(tempImageUri);
              
              break; 
            } else if (part.text) {
              console.log("Gemini API text response:", part.text);
            }
          }
          
          if (!imageFound) {
            console.warn("No image data found in Gemini response parts.");
            Alert.alert('No Image Generated', 'The AI did not return an image. It might have provided a text response instead. Check console for details.');
          }
        } else {
          const blockReason = candidate.finishReason;
          const safetyRatings = candidate.safetyRatings;
          console.error('Gemini content generation issue. Finish Reason:', blockReason, 'Safety Ratings:', safetyRatings);
          let alertMessage = 'Failed to generate image. The content might have been blocked.';
          if (blockReason) {
            alertMessage += ` Reason: ${blockReason}.`;
          }
          if (safetyRatings && safetyRatings.length > 0) {
            alertMessage += ` Safety issues: ${safetyRatings.map((r: any) => `${r.category} was ${r.probability}`).join(', ')}.`;
          }
          Alert.alert('Generation Issue', alertMessage);
        }
      } else {
        console.error('No candidates found in Gemini response:', result);
        Alert.alert('API Error', 'No candidates returned from Gemini API. Check console for response details.');
      }
    } catch (error: any) {
      console.error('Gemini Generation error:', error);
      if (error.response) {
        console.error('API Error Response:', error.response.data);
        Alert.alert('API Error', `Failed to generate image: ${JSON.stringify(error.response.data)}`);
      } else if (error.message && error.message.includes("SafetyRatings")) {
         Alert.alert('Content Moderation', `Image generation failed due to safety settings: ${error.message}`);
      }
      else {
        Alert.alert('Error', `Failed to generate image: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const autoSaveToHistory = async (imageUri: string) => {
    try {
      const timestamp = new Date().getTime();
      const filename = `aifitbolt-${timestamp}.jpg`;
      const permanentLocalImageUri = `${FileSystem.documentDirectory}${filename}`;

      console.log(`Auto-saving: Copying image from ${imageUri} to private directory: ${permanentLocalImageUri}`);
      await FileSystem.copyAsync({ from: imageUri, to: permanentLocalImageUri });
      console.log('Auto-saving: Image copied to private directory for history.');

      const historyEntry = {
        id: timestamp.toString(),
        imageUri: permanentLocalImageUri,
        timestamp: timestamp,
        category: selectedCategory || 'casual', // Default to casual if no category selected
      };

      const existingHistoryString = await AsyncStorage.getItem(GENERATION_HISTORY_KEY);
      const existingHistory = existingHistoryString ? JSON.parse(existingHistoryString) : [];
      const updatedHistory = [historyEntry, ...existingHistory]; 

      await AsyncStorage.setItem(GENERATION_HISTORY_KEY, JSON.stringify(updatedHistory));
      console.log('Auto-saving: Generation history updated in AsyncStorage.');
      
      // Show subtle toast notification
      Toast.show({
        type: 'success',
        text1: 'Image Saved',
        text2: `Added to your ${historyEntry.category} collection`,
        position: 'bottom',
        visibilityTime: 2000,
      });

      // Reset selected category after save
      setSelectedCategory(null);
    } catch (error) {
      console.error('Auto-saving error:', error);
      Toast.show({
        type: 'error',
        text1: 'Auto-Save Failed',
        position: 'bottom',
        visibilityTime: 2000,
      });
    }
  };

  // New function to open category selector and prepare for save
  const prepareToSave = (imageUri: string) => {
    setImageToSave(imageUri);
    // First close full-screen modal, then show category selector
    setShowFullScreenImage(false);
    // Use a short timeout to ensure modals transition properly
    setTimeout(() => {
      setShowCategorySelector(true);
    }, 300);
  };

  // Save to history with category
  const saveToHistoryWithCategory = async () => {
    if (!imageToSave) {
      Toast.show({
        type: 'error',
        text1: 'No image to save',
        position: 'bottom',
        visibilityTime: 2000,
      });
      return;
    }

    if (!selectedCategory) {
      Toast.show({
        type: 'error',
        text1: 'Please select a category',
        position: 'bottom',
        visibilityTime: 2000,
      });
      return;
    }

    try {
      const timestamp = new Date().getTime();
      const filename = `aifitbolt-${timestamp}.jpg`;
      const permanentLocalImageUri = `${FileSystem.documentDirectory}${filename}`;

      console.log(`Copying image from ${imageToSave} to private directory: ${permanentLocalImageUri}`);
      await FileSystem.copyAsync({ from: imageToSave, to: permanentLocalImageUri });
      console.log('Image copied to private directory for history.');

      const historyEntry = {
        id: timestamp.toString(),
        imageUri: permanentLocalImageUri,
        timestamp: timestamp,
        category: selectedCategory,
      };

      const existingHistoryString = await AsyncStorage.getItem(GENERATION_HISTORY_KEY);
      const existingHistory = existingHistoryString ? JSON.parse(existingHistoryString) : [];
      const updatedHistory = [historyEntry, ...existingHistory]; 

      await AsyncStorage.setItem(GENERATION_HISTORY_KEY, JSON.stringify(updatedHistory));
      console.log('Generation history updated in AsyncStorage.');
      
      Toast.show({
        type: 'success',
        text1: 'Saved to History',
        text2: `Added to your ${selectedCategory} collection`,
        position: 'bottom',
        visibilityTime: 2000,
      });

      // Close modals and reset state
      setShowCategorySelector(false);
      setShowFullScreenImage(false);
      setImageToSave(null);
      setSelectedCategory(null);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: 'Could not save to history',
        position: 'bottom',
        visibilityTime: 2000,
      });
      console.error('Save history error:', error);
    }
  };

  const saveToGallery = async () => {
    if (!resultImage) {
      Toast.show({
        type: 'error',
        text1: 'No image to save',
        position: 'bottom',
        visibilityTime: 2000,
      });
      return;
    }

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Permission Denied',
          text2: 'Gallery permission is needed to save images',
          position: 'bottom',
          visibilityTime: 3000,
        });
        return;
      }

      await MediaLibrary.saveToLibraryAsync(resultImage);
      Toast.show({
        type: 'success',
        text1: 'Image Saved',
        text2: 'Saved to your device gallery',
        position: 'bottom',
        visibilityTime: 2000,
      });
      
      const currentCountStr = await AsyncStorage.getItem(SAVE_COUNT_KEY);
      const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;
      const newCount = currentCount + 1;
      await AsyncStorage.setItem(SAVE_COUNT_KEY, newCount.toString());
      
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Save Failed',
        text2: 'Could not save to gallery',
        position: 'bottom',
        visibilityTime: 2000,
      });
      console.error('Save to gallery error:', error);
    }
  };

  const shareImage = async () => {
    if (!resultImage) {
      Toast.show({
        type: 'error',
        text1: 'No image to share',
        position: 'bottom',
        visibilityTime: 2000,
      });
      return;
    }

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Toast.show({
          type: 'error',
          text1: 'Sharing Unavailable',
          text2: 'Sharing is not available on this device',
          position: 'bottom',
          visibilityTime: 3000,
        });
        return;
      }

      const shareFilename = `virtual-tryon-share-${new Date().getTime()}.jpg`;
      const shareFileUri = `${FileSystem.documentDirectory}sharing/${shareFilename}`;
      
      await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}sharing/`, { intermediates: true });
      
      console.log(`Copying image from ${resultImage} to ${shareFileUri} for sharing...`);
      await FileSystem.copyAsync({ from: resultImage, to: shareFileUri });
      console.log('Image copied for sharing to:', shareFileUri);
      
      await Sharing.shareAsync(shareFileUri, {
        mimeType: 'image/jpeg', 
        dialogTitle: 'Share your virtual try-on', 
        UTI: 'public.jpeg' 
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Share Failed',
        position: 'bottom',
        visibilityTime: 2000,
      });
      console.error('Share error:', error);
    }
  };

  return (
    <View style={styles.container}>
      {!bodyImage ? (
        <TouchableOpacity 
          style={styles.uploadBodyContainer}
          onPress={selectBodyImage}
        >
          <CirclePlus size={40} color="#8A8A8E" />
          <Text style={styles.uploadText}>Upload a photo</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.bodyImageContainer}>
          <Image 
            source={{ uri: bodyImage }} 
            style={styles.bodyImage} 
            resizeMode="cover"
          />
          
          <TouchableOpacity 
            style={styles.resetButton}
            onPress={resetTryOn}
          >
            <RefreshCcw size={18} color="#FFFFFF" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.savedModelsButton}
            onPress={() => setIsModelSelectorVisible(true)}
          >
            <Archive size={18} color="#FFFFFF" />
          </TouchableOpacity>
          
          {tryOnItems.map((item) => (
            <TouchableOpacity
              key={item.category}
              style={[
                styles.itemButton, 
                { 
                  top: item.position.top, 
                  left: item.position.left, 
                  right: item.position.right
                } as any,
                selectedItems[item.category] ? styles.itemButtonSelected : {}
              ]}
              onPress={() => selectItemImage(item.category)}
            >
              <View style={styles.itemButtonInner}>
                <Text style={styles.itemEmoji}>{item.emoji}</Text>
                <Text style={styles.itemLabel}>
                  {selectedItems[item.category] ? `${item.label} ✓` : item.label}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            style={[
              styles.generateButton,
              (Object.values(selectedItems).filter(Boolean).length === 0 || isGenerating) ? 
                styles.generateButtonDisabled : {}
            ]}
            onPress={generateImage}
            disabled={Object.values(selectedItems).filter(Boolean).length === 0 || isGenerating}
          >
            <Text style={styles.generateButtonText}>
              {isGenerating ? 'Generating...' : 'Try-On ✨'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        animationType="fade"
        transparent={false}
        visible={showFullScreenImage}
        onRequestClose={() => setShowFullScreenImage(false)}
        statusBarTranslucent={true}
      >
        <SafeAreaView style={styles.fullScreenContainer}>
          {resultImage && (
            <Image 
              source={{ uri: resultImage }} 
              style={styles.fullScreenImage} 
              resizeMode="contain"
            />
          )}
          <View style={styles.fullScreenControls}>
            <TouchableOpacity 
              style={[styles.fullScreenButton, styles.saveHistoryButton]}
              onPress={() => prepareToSave(resultImage || '')} 
            >
              <Bookmark size={18} color="#FFFFFF" />
              <Text style={styles.fullScreenButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fullScreenButton, styles.shareButton]} 
              onPress={shareImage} 
            >
              <Share size={18} color="#FFFFFF" />
              <Text style={styles.fullScreenButtonText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fullScreenButton, styles.saveGalleryButton]}
              onPress={saveToGallery} 
            >
              <Download size={18} color="#FFFFFF" />
              <Text style={styles.fullScreenButtonText}>Download</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={styles.fullScreenCloseButton} 
            onPress={() => setShowFullScreenImage(false)}
          >
            <X size={24} color="#000000" />
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      {/* Category selector modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showCategorySelector}
        onRequestClose={() => setShowCategorySelector(false)}
        statusBarTranslucent={true}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.categorySelectorContainer}>
            <View style={styles.categorySelectorHeader}>
              <Text style={styles.categorySelectorTitle}>Select Category</Text>
              <TouchableOpacity 
                onPress={() => setShowCategorySelector(false)}
                style={styles.categorySelectorCloseButton}
              >
                <X size={24} color="#000000" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.categorySelectorSubtitle}>Choose a category for your outfit:</Text>
            
            <FlatList
              data={OUTFIT_CATEGORIES}
              numColumns={2}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    styles.categoryItem,
                    selectedCategory === item.id && styles.selectedCategoryItem
                  ]}
                  onPress={() => setSelectedCategory(item.id)}
                >
                  <Text style={styles.categoryEmoji}>{item.emoji}</Text>
                  <Text style={[
                    styles.categoryName,
                    selectedCategory === item.id && styles.selectedCategoryName
                  ]}>{item.name}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.categoriesList}
            />
            
            <View style={styles.categorySelectorButtons}>
              <TouchableOpacity 
                style={[styles.categorySelectorButton, styles.cancelButton]}
                onPress={() => {
                  setShowCategorySelector(false);
                  setSelectedCategory(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.categorySelectorButton, 
                  styles.saveButton,
                  !selectedCategory && styles.disabledButton
                ]}
                onPress={saveToHistoryWithCategory}
                disabled={!selectedCategory}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      <ModelSelectorModal
        visible={isModelSelectorVisible}
        onClose={() => setIsModelSelectorVisible(false)}
        onSelect={handleModelSelected}
        currentImage={bodyImage}
      />

      {isGenerating && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#333" />
          <Text style={styles.loadingText}>Generating your virtual try-on...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  uploadBodyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    margin: 0,
    borderRadius: 0, 
    width: '100%',
    height: Dimensions.get('window').height,
  },
  uploadText: {
    marginTop: 12,
    fontSize: 16,
    color: '#555555',
  },
  bodyImageContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#FFFFFF',
    width: '100%',
    height: Dimensions.get('window').height,
  },
  bodyImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  itemButton: {
    position: 'absolute',
    backgroundColor: 'rgba(240, 240, 240, 0.85)',
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 18,
    minWidth: 110,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(200, 200, 200, 0.5)',
  },
  itemButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemButtonSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    borderColor: 'rgba(0, 100, 220, 0.7)',
  },
  itemEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000', 
  },
  generateButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
    left: 20,
    right: 20,
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  generateButtonDisabled: {
    backgroundColor: '#D0D0D0',
    shadowOpacity: 0.1,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#333333',
    marginTop: 16,
    fontSize: 16,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  fullScreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    resizeMode: 'contain',
  },
  fullScreenControls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  fullScreenButton: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  saveHistoryButton: {
    backgroundColor: 'rgba(90, 200, 250, 0.85)',
  },
  saveGalleryButton: {
    backgroundColor: 'rgba(48, 209, 88, 0.85)',
  },
  shareButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.85)',
  },
  fullScreenButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
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
  resetButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 10,
    borderRadius: 20,
    zIndex: 10,
  },
  savedModelsButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 10,
    borderRadius: 20,
    zIndex: 10,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modelSelectorContainer: {
    width: '90%',
    height: '70%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modelSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modelSelectorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modelSelectorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modelSelectorText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
  },
  modelList: {
    padding: 10,
  },
  modelItem: {
    width: '45%',
    margin: '2.5%',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  modelImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#e0e0e0',
  },
  modelName: {
    padding: 8,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  saveCurrentModelButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  saveCurrentModelButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  saveModelModalContainer: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  saveModelModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  saveModelModalSubtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
  },
  modelNameInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  saveModelModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saveModelModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  saveModelModalCancelButton: {
    backgroundColor: '#F2F2F2',
  },
  saveModelModalSaveButton: {
    backgroundColor: '#007AFF',
  },
  saveModelModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modelItemOverlay: {
    position: 'absolute',
    top: 5,
    right: 5,
    flexDirection: 'row',
  },
  deleteModelButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categorySelectorContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 10000,
  },
  categorySelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  categorySelectorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  categorySelectorCloseButton: {
    padding: 5,
  },
  categorySelectorSubtitle: {
    fontSize: 16,
    color: '#555555',
    marginBottom: 20,
  },
  categoriesList: {
    paddingBottom: 20,
  },
  categoryItem: {
    width: '45%',
    margin: '2.5%',
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedCategoryItem: {
    backgroundColor: '#E1F5FE',
    borderColor: '#0A84FF',
  },
  categoryEmoji: {
    fontSize: 30,
    marginBottom: 10,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
  },
  selectedCategoryName: {
    color: '#0A84FF',
  },
  categorySelectorButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  categorySelectorButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#F2F2F2',
  },
  saveButton: {
    backgroundColor: '#0A84FF',
  },
  disabledButton: {
    backgroundColor: '#A0A0A0',
    opacity: 0.7,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default VirtualTryOn; 