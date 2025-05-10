import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  SafeAreaView,
  StatusBar,
  Dimensions,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleGenAI, Modality, HarmCategory, HarmBlockThreshold, SafetyRating } from "@google/genai";
import { Camera, Tally3, FileUp, CirclePlus as PlusCircle, Download, Eye, ChevronDown, ChevronUp, Replace, Share, Bookmark, X, BookmarkPlus } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { photoStore } from '@/store/photoStore';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as StoreReview from 'expo-store-review';
import * as Sharing from 'expo-sharing';
import LoadingOverlay from '@/components/LoadingOverlay';
import ModelSelectorModal from '@/components/ModelSelectorModal';
import SaveModelModal from '@/components/SaveModelModal';
import VirtualTryOn from '@/components/VirtualTryOn';

// Gemini API Anahtarı
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ;

// React Native'de URL'den base64'e dönüştürme
async function imageUrlToBase64(imageUrl: string): Promise<string> {
  try {
    const response = await FileSystem.downloadAsync(
      imageUrl,
      FileSystem.documentDirectory + 'temp_image.jpg'
    );
    
    if (response.status === 200) {
      const base64 = await FileSystem.readAsStringAsync(response.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    } else {
      throw new Error(`Failed to download image: ${response.status}`);
    }
  } catch (error) {
    console.error('Error converting URL to base64:', error);
    throw error;
  }
}

// React Native'de yerel URI'yi base64'e dönüştürme
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

const SAVE_COUNT_KEY = 'successful_saves_count';
const RATING_REQUESTED_KEY = 'rating_requested';
const GENERATION_HISTORY_KEY = 'generationHistory'; // Key for AsyncStorage
const SAVED_MODELS_KEY = 'savedBodyModels'; // Key for saved models

export default function HomeScreen() {
  const { user, isAuthenticated } = useAuth();
  const { 
    bodyImage, setBodyImage, 
    garmentImage, setGarmentImage, 
    resultImage, setResultImage,
    garmentDescription, setGarmentDescription,
    category, setCategory 
  } = photoStore();
  
  // Use new UI flag
  const [useNewUI, setUseNewUI] = useState(true);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isSaveModelModalVisible, setIsSaveModelModalVisible] = useState(false);
  const [modelNameInput, setModelNameInput] = useState('');
  const [isModelSelectorVisible, setIsModelSelectorVisible] = useState(false);
  const [modelToSaveUri, setModelToSaveUri] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    }
    
    checkUsageCount();
    requestPermissions();
  }, [isAuthenticated]);

  const requestPermissions = async () => {
    try {
      // Medya kütüphanesi (galeri) izinleri
      const { status: mediaLibraryStatus } = await MediaLibrary.requestPermissionsAsync();
      
      // Medya kütüphanesine erişim izinleri
      const { status: mediaLibraryAccessStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      // Kamera izinleri
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      
      setIsPermissionGranted(
        mediaLibraryStatus === 'granted' && 
        mediaLibraryAccessStatus === 'granted'
      );
      
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

  const selectImage = async (type: 'body' | 'garment') => {
    try {
      // Önce izinleri kontrol et
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow gallery access to select photos');
        return;
      }
      
      const options: ImagePicker.ImagePickerOptions = {
        allowsEditing: false,
        quality: 0.8,
      };

      const result = await ImagePicker.launchImageLibraryAsync(options);
      
      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].uri) {
        if (type === 'body') {
          setBodyImage(result.assets[0].uri);
        } else {
          setGarmentImage(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Image selection error:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const takePhoto = async (type: 'body' | 'garment') => {
    try {
      // Kamera izinlerini kontrol et
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow camera access to take photos');
        return;
      }

      const options: ImagePicker.ImagePickerOptions = {
        allowsEditing: false,
        quality: 0.8,
      };

      const result = await ImagePicker.launchCameraAsync(options);
      
      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].uri) {
        if (type === 'body') {
          setBodyImage(result.assets[0].uri);
        } else {
          setGarmentImage(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const generateImage = async () => {
    if (!bodyImage || !garmentImage) {
      Alert.alert('Missing Images', 'Please upload both body and garment images');
      return;
    }

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
    setResultImage(null); // Önceki sonucu temizle

    try {
      console.log('Starting image generation with Google Gemini API...');
      
      console.log('Processing body image for Gemini...');
      const humanImageBase64 = await localUriToBase64(bodyImage);
      
      console.log('Processing garment image for Gemini...');
      const garmentImageBase64 = await localUriToBase64(garmentImage);
      
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
            
      console.log('Gemini API raw result:', JSON.stringify(result, null, 2));

      if (result && result.candidates && result.candidates.length > 0) {
        const candidate = result.candidates[0];
        if (candidate.content && candidate.content.parts) {
          let imageFound = false;
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.data) {
              console.log('Image data found in Gemini response.');
              const base64ImageData = part.inlineData.data;
              
              // Base64 verisini geçici bir dosyaya yaz
              const filename = `gemini-output-${Date.now()}.jpeg`;
              const tempImageUri = `${FileSystem.cacheDirectory}${filename}`;
              
              console.log(`Saving Gemini output to temporary file: ${tempImageUri}`);
              await FileSystem.writeAsStringAsync(tempImageUri, base64ImageData, {
                encoding: FileSystem.EncodingType.Base64,
              });
              console.log('Gemini output saved successfully.');
              
              setResultImage(tempImageUri);
              setShowFullScreen(true);
              imageFound = true;
              break; // İlk resmi al ve döngüden çık
            } else if (part.text) {
              console.log("Gemini API text response:", part.text);
              // İsteğe bağlı olarak metin yanıtını kullanıcıya gösterebilirsiniz.
            }
          }
          if (!imageFound) {
            console.warn("No image data found in Gemini response parts. Parts:", candidate.content.parts);
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
            alertMessage += ` Safety issues: ${safetyRatings.map((r: SafetyRating) => `${r.category} was ${r.probability}`).join(', ')}.`;
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
      } else if (error.message.includes("SafetyRatings")) { // Gemini SDK'sının güvenlik hatası formatı
         Alert.alert('Content Moderation', `Image generation failed due to safety settings: ${error.message}`);
      }
      else {
        Alert.alert('Error', `Failed to generate image: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Puanlama isteme mantığı
  const askForRating = async () => {
    const RATING_THRESHOLD = 3; // Kaçıncı kaydetmeden sonra sorulacak

    try {
      const alreadyRequested = await AsyncStorage.getItem(RATING_REQUESTED_KEY);
      if (alreadyRequested === 'true') {
        console.log('Rating already requested.');
        return; // Daha önce sorulduysa tekrar sorma
      }

      const currentCountStr = await AsyncStorage.getItem(SAVE_COUNT_KEY);
      const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0;
      const newCount = currentCount + 1;

      await AsyncStorage.setItem(SAVE_COUNT_KEY, newCount.toString());
      console.log('Successful save count:', newCount);

      if (newCount >= RATING_THRESHOLD) {
        const isAvailable = await StoreReview.isAvailableAsync();
        if (isAvailable) {
          console.log('Requesting store review...');
          StoreReview.requestReview();
          await AsyncStorage.setItem(RATING_REQUESTED_KEY, 'true'); // Soruldu olarak işaretle
          // Sayacı sıfırlamaya gerek yok, sadece bir kez soracağız.
        } else {
          console.log('Store review is not available on this device.');
        }
      }
    } catch (error) {
      console.error('Error handling rating request:', error);
    }
  };

  // Function to save image to app's history (private directory + AsyncStorage)
  const saveToHistory = async () => {
    if (!resultImage) {
      Alert.alert('Error', 'No result image to save to history.');
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

  // Function to save image to device's public gallery
  const saveToDeviceGallery = async () => {
    if (!resultImage) {
      Alert.alert('Error', 'No result image to save to gallery.');
      return;
    }

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery permission is needed to save the image.');
        return;
      }

      console.log(`Saving image from local URI ${resultImage} to device gallery.`);
      await MediaLibrary.saveToLibraryAsync(resultImage);
      Alert.alert('Success', 'Image saved to your device gallery!');
      
      await askForRating();

    } catch (error) {
      Alert.alert('Error', 'Failed to save image to gallery.');
      console.error('Save to gallery error:', error);
    }
  };

  const shareImage = async () => {
    if (!resultImage) {
      Alert.alert('Error', 'No image to share.');
      return;
    }

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device.');
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

      console.log('Image shared successfully.');

    } catch (error) {
      Alert.alert('Error', 'Failed to share image.');
      console.error('Share error:', error);
    }
  };

  const handleImageUpload = (type: 'body' | 'garment') => {
    Alert.alert(
      'Upload Photo', 
      'Choose a photo source',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Camera',
          onPress: () => takePhoto(type)
        },
        {
          text: 'Gallery',
          onPress: () => selectImage(type)
        },
        // Add "Select Saved Model" option only for body images
        ...(type === 'body' ? 
            [{
                text: 'Select Saved Model',
                onPress: () => setIsModelSelectorVisible(true)
            }] 
            : []
        )
      ]
    );
  };

  const PhotoUploadSection = ({ 
    title, 
    image, 
    type,
    placeholder
  }: { 
    title: string; 
    image: string | null; 
    type: 'body' | 'garment';
    placeholder: string;
  }) => (
    <View style={styles.uploadSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity 
        style={styles.uploadArea} 
        onPress={() => handleImageUpload(type)}
        activeOpacity={0.8}
      >
        {image ? (
          <>
            <Image 
              source={{ uri: image }} 
              style={styles.previewImage}
            />
            <TouchableOpacity 
              style={styles.changeImageButton}
              onPress={() => handleImageUpload(type)}
              activeOpacity={0.8}
            >
              <Replace size={18} color="#FFFFFF" />
            </TouchableOpacity>
            {/* Add Save Model Button only for body image */} 
            {type === 'body' && (
                 <TouchableOpacity 
                    style={styles.saveModelButton}
                    onPress={openSaveModelModal}
                    activeOpacity={0.8}
                  >
                    <BookmarkPlus size={18} color="#FFFFFF" />
                  </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.placeholderContainer}>
            <FileUp size={32} color="#8E8E93" />
            <Text style={styles.placeholderText}>{placeholder}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  // --- Save Body Model Logic ---
  const openSaveModelModal = () => {
    if (!bodyImage) {
      Alert.alert("No Image", "Please select a body image first.");
      return;
    }
    setModelToSaveUri(bodyImage);
    setIsSaveModelModalVisible(true);
  };

  const handleSaveModel = async (modelName: string) => {
    if (!modelToSaveUri) {
        console.error("handleSaveModel called with no modelToSaveUri set.");
        Alert.alert("Error", "Cannot save model, image URI is missing.");
        return;
    } 

    setIsSaveModelModalVisible(false);

    try {
      // 1. Create permanent file path
      const timestamp = Date.now();
      const fileExtension = modelToSaveUri.split('.').pop() || 'jpg'; 
      const permanentFilename = `model-${timestamp}.${fileExtension}`;
      const permanentUri = `${FileSystem.documentDirectory}${permanentFilename}`;

      // 2. Copy image to permanent location
      console.log(`Copying model image from ${modelToSaveUri} to ${permanentUri}`);
      await FileSystem.copyAsync({ from: modelToSaveUri, to: permanentUri });
      console.log('Model image copied successfully.');

      // 3. Create model object
      const newModel = {
        id: timestamp.toString(),
        name: modelName,
        uri: permanentUri, 
      };

      // 4. Update AsyncStorage
      const existingModelsString = await AsyncStorage.getItem(SAVED_MODELS_KEY);
      const existingModels = existingModelsString ? JSON.parse(existingModelsString) : [];
      const updatedModels = [newModel, ...existingModels];

      await AsyncStorage.setItem(SAVED_MODELS_KEY, JSON.stringify(updatedModels));
      console.log('Saved models list updated in AsyncStorage.');

      Alert.alert('Model Saved', `Model "${modelName}" has been saved successfully!`);

    } catch (error) {
      console.error('Failed to save model:', error);
      Alert.alert('Error', 'Could not save the model. Please try again.');
    }
    setModelToSaveUri(null);
  };

  // --- Select Saved Model Logic (REMOVED - Replaced by Modal) ---
  // const selectSavedModel = async () => { ... }; 

  // --- Function called when a model is selected from the modal ---
  const handleModelSelected = (uri: string) => {
    setBodyImage(uri); // Set the image
    setIsModelSelectorVisible(false); // Close the modal
  };

  // Return the new UI if enabled, otherwise the original UI
  if (useNewUI) {
    return <VirtualTryOn />;
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.remainingText}>
            {usageCount > 0 && (
              <>
                <Tally3 size={14} color="#8E8E93" />
                <Text> {usageCount}/20 free generations used</Text>
              </>
            )}
          </Text>
        </View>
        
        <PhotoUploadSection 
          title="Upload Your Photo" 
          image={bodyImage}
          type="body"
          placeholder="Tap to upload a full-body photo"
        />
        
        <PhotoUploadSection 
          title="Upload Clothing Item" 
          image={garmentImage}
          type="garment" 
          placeholder="Tap to upload a clothing item"
        />

        <View style={styles.uploadSection}>
          <TouchableOpacity 
            style={styles.advancedSettingsHeader} 
            onPress={() => setShowAdvancedSettings(!showAdvancedSettings)}
            activeOpacity={0.8}
          >
            <Text style={styles.advancedSettingsTitle}>Advanced Settings</Text>
            {showAdvancedSettings ? (
              <ChevronUp size={20} color="#B0B0B0" />
            ) : (
              <ChevronDown size={20} color="#B0B0B0" />
            )}
          </TouchableOpacity>
          
          {showAdvancedSettings && (
            <View style={styles.advancedSettingsContent}>
                <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Description of garment</Text>
                    <TextInput
                        style={styles.textInput}
                        placeholder="e.g. Short Sleeve Round Neck T-shirt"
                        placeholderTextColor="#8E8E93"
                        value={garmentDescription}
                        onChangeText={setGarmentDescription}
                    />
                </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Category</Text>
                <View style={styles.categoryButtons}>
                  <TouchableOpacity 
                    style={[
                      styles.categoryButton, 
                      category === 'upper_body' && styles.categoryButtonActive
                    ]}
                    onPress={() => { setCategory('upper_body'); setShowAdvancedSettings(false); }}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      category === 'upper_body' && styles.categoryButtonTextActive
                    ]}>
                      Upper Body
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.categoryButton, 
                      category === 'lower_body' && styles.categoryButtonActive
                    ]}
                    onPress={() => { setCategory('lower_body'); setShowAdvancedSettings(false); }}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      category === 'lower_body' && styles.categoryButtonTextActive
                    ]}>
                      Lower Body
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.categoryButton, 
                      category === 'dresses' && styles.categoryButtonActive
                    ]}
                    onPress={() => { setCategory('dresses'); setShowAdvancedSettings(false); }}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      category === 'dresses' && styles.categoryButtonTextActive
                    ]}>
                      Dresses
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
        
        <TouchableOpacity 
          style={[
            styles.generateButton, 
            (!bodyImage || !garmentImage || isGenerating) && styles.generateButtonDisabled
          ]} 
          onPress={generateImage}
          disabled={!bodyImage || !garmentImage || isGenerating}
          activeOpacity={0.8}
        >
          <PlusCircle size={20} color="#FFFFFF" />
          <Text style={styles.generateButtonText}>Generate Try-On</Text>
        </TouchableOpacity>
        
        {resultImage && (
          <TouchableOpacity 
            style={styles.viewResultButton} 
            onPress={() => setShowFullScreen(true)}
            activeOpacity={0.8}
          >
            <Eye size={20} color="#FFFFFF" />
            <Text style={styles.viewResultText}>View Last Generated Image</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Fullscreen Result Modal */}
      <Modal
        animationType="fade"
        transparent={false}
        visible={showFullScreen}
        onRequestClose={() => setShowFullScreen(false)}
        statusBarTranslucent={true}
      >
        <SafeAreaView style={styles.fullScreenContainer}>
          {resultImage && (
            <Image 
              source={{ uri: resultImage }} 
              style={styles.fullScreenImage} 
            />
          )}
          <View style={styles.fullScreenControls}>
            <TouchableOpacity 
              style={[styles.fullScreenButton, styles.saveHistoryButton]}
              onPress={saveToHistory} 
            >
              <Bookmark size={18} color="#FFFFFF" />
              <Text style={styles.fullScreenButtonText}>Save to History</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fullScreenButton, styles.saveGalleryButton]}
              onPress={saveToDeviceGallery} 
            >
              <Download size={18} color="#FFFFFF" />
              <Text style={styles.fullScreenButtonText}>Save to Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fullScreenButton, styles.shareButton]} 
              onPress={shareImage} 
            >
              <Share size={18} color="#FFFFFF" />
              <Text style={styles.fullScreenButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={styles.fullScreenCloseButton} 
            onPress={() => setShowFullScreen(false)}
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      {/* Save Model Name Input Modal (REMOVED Inline JSX) */}
      <SaveModelModal 
          visible={isSaveModelModalVisible}
          imageUri={modelToSaveUri}
          onClose={() => {
              setIsSaveModelModalVisible(false);
              setModelToSaveUri(null);
          }}
          onSave={handleSaveModel}
      />

      {/* Model Selector Modal */}
      <ModelSelectorModal 
          visible={isModelSelectorVisible}
          onClose={() => setIsModelSelectorVisible(false)}
          onSelect={handleModelSelected}
      />

      {/* Loading Overlay */}
      <LoadingOverlay visible={isGenerating} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    paddingBottom: 25,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12,
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  remainingText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  uploadSection: {
    backgroundColor: '#F0F0F0',
    borderRadius: 0,
    padding: 0,
    marginBottom: 16,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000000',
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  uploadArea: {
    backgroundColor: '#E8E8E8',
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  placeholderText: {
    marginTop: 10,
    fontSize: 15,
    color: '#555555',
    textAlign: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  changeImageButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 10,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveModelButton: {
    position: 'absolute',
    top: 20,
    right: 70,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 10,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 0,
    marginTop: 5,
    marginBottom: 12,
    width: '100%',
  },
  generateButtonDisabled: {
    backgroundColor: '#D0D0D0',
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 17,
    marginLeft: 8,
  },
  viewResultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 0,
    marginTop: 0,
    marginBottom: 12,
    width: '100%',
  },
  viewResultText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 17,
    marginLeft: 8,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 0,
  },
  fullScreenImage: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  fullScreenControls: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  fullScreenButton: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: 'rgba(100, 100, 100, 0.8)',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  saveHistoryButton: {
    backgroundColor: 'rgba(90, 200, 250, 0.9)',
  },
  saveGalleryButton: {
    backgroundColor: 'rgba(48, 209, 88, 0.9)',
  },
  shareButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
  },
  fullScreenButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  fullScreenCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 40 : 20,
    left: 15,
    backgroundColor: 'rgba(150, 150, 150, 0.5)',
    padding: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  advancedSettingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  advancedSettingsTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  advancedSettingsContent: {
    marginTop: 6,
  },
  inputContainer: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 14,
    color: '#555555',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#E8E8E8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    color: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  categoryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 7,
  },
  categoryButton: {
    flex: 1,
    backgroundColor: '#E8E8E8',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 6,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D0D0D0',
    minHeight: 40,
    justifyContent: 'center'
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryButtonText: {
    color: '#333333',
    fontSize: 13,
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});