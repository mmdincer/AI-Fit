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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CirclePlus, Share, Download, Bookmark, X } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleGenAI, Modality } from "@google/genai";
import { router } from 'expo-router';

// Gemini API Key (using the same from index.tsx)
const GEMINI_API_KEY = "AIzaSyAWZzdckiekff9n3BrUpq-zKLXNaraZF3U";

// Shared AsyncStorage keys
const GENERATION_HISTORY_KEY = 'generationHistory';
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

const VirtualTryOn = () => {
  const [bodyImage, setBodyImage] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<{[key in Category]?: string | null}>({});
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFullScreenImage, setShowFullScreenImage] = useState(false);
  const [usageCount, setUsageCount] = useState(0);

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
    if (newCount > 50) {
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

  const saveToGallery = async () => {
    if (!resultImage) {
      Alert.alert('Error', 'No result image to save');
      return;
    }

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery permission is needed to save the image');
        return;
      }

      await MediaLibrary.saveToLibraryAsync(resultImage);
      Alert.alert('Success', 'Image saved to your device gallery!');
      
      const currentCountStr = await AsyncStorage.getItem(SAVE_COUNT_KEY);
      const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;
      const newCount = currentCount + 1;
      await AsyncStorage.setItem(SAVE_COUNT_KEY, newCount.toString());
      
    } catch (error) {
      Alert.alert('Error', 'Failed to save image');
      console.error('Save to gallery error:', error);
    }
  };

  const shareImage = async () => {
    if (!resultImage) {
      Alert.alert('Error', 'No image to share');
      return;
    }

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
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
      Alert.alert('Error', 'Failed to share image');
      console.error('Share error:', error);
    }
  };

  const saveToHistory = async () => {
    if (!resultImage) {
      Alert.alert('Error', 'No result image to save');
      return;
    }

    try {
      const timestamp = new Date().getTime();
      const filename = `aifitbolt-${timestamp}.jpg`;
      const permanentLocalImageUri = `${FileSystem.documentDirectory}${filename}`;

      console.log(`Copying image from ${resultImage} to private directory: ${permanentLocalImageUri}`);
      await FileSystem.copyAsync({ from: resultImage, to: permanentLocalImageUri });
      console.log('Image copied to private directory for history.');

      const historyEntry = {
        id: timestamp.toString(),
        imageUri: permanentLocalImageUri,
        timestamp: timestamp,
      };

      const existingHistoryString = await AsyncStorage.getItem(GENERATION_HISTORY_KEY);
      const existingHistory = existingHistoryString ? JSON.parse(existingHistoryString) : [];
      const updatedHistory = [historyEntry, ...existingHistory]; 

      await AsyncStorage.setItem(GENERATION_HISTORY_KEY, JSON.stringify(updatedHistory));
      console.log('Generation history updated in AsyncStorage.');
      Alert.alert('Saved', 'Image added to your Creations history!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save image to history.');
      console.error('Save history error:', error);
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
              {isGenerating ? 'Generating...' : 'Generate Image'}
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
              onPress={saveToHistory} 
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
});

export default VirtualTryOn; 