import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Dimensions,
  Alert,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { X, Save, Trash } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import Toast from 'react-native-toast-message';

const SAVED_MODELS_KEY = 'savedBodyModels';

interface SavedModel {
  id: string;
  name: string;
  uri: string;
}

interface ModelSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (uri: string) => void;
  currentImage?: string | null;
}

const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({ visible, onClose, onSelect, currentImage }) => {
  const [models, setModels] = useState<SavedModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // --- Responsive Grid Calculation (Similar to Gallery) ---
  const screenWidth = Dimensions.get('window').width * 0.9; // Modal width is 90% of screen
  const numColumns = useMemo(() => 2, []); // Force 2 columns
  const itemMargin = 10; // Increased margin for more spacing
  const itemWidth = useMemo(() => {
      return (screenWidth - itemMargin * (numColumns + 1)) / numColumns;
  }, [screenWidth, numColumns, itemMargin]);
  // --- End Responsive Grid Calculation ---

  const loadModels = useCallback(async () => {
    if (!visible) return; // Don't load if not visible
    setIsLoading(true);
    try {
      const modelsString = await AsyncStorage.getItem(SAVED_MODELS_KEY);
      const loadedModels = modelsString ? JSON.parse(modelsString) : [];
      setModels(loadedModels);
    } catch (error) {
      console.error('Failed to load saved models:', error);
      setModels([]);
    } finally {
      setIsLoading(false);
    }
  }, [visible]);

  // Load models when the modal becomes visible
  useEffect(() => {
    loadModels();
  }, [loadModels]); // Dependency ensures reload if visibility changes

  const handleSelectModel = (uri: string) => {
    onSelect(uri); // Pass the selected URI back
    onClose(); // Close the modal
  };

  // Function to delete a model
  const deleteModel = (id: string, uri: string) => {
    Alert.alert(
      'Delete Model',
      'Are you sure you want to delete this model?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove from state first for UI responsiveness
              const updatedModels = models.filter(model => model.id !== id);
              setModels(updatedModels);
              
              // Update AsyncStorage
              await AsyncStorage.setItem(SAVED_MODELS_KEY, JSON.stringify(updatedModels));
              
              // Delete the image file
              try {
                const fileInfo = await FileSystem.getInfoAsync(uri);
                if (fileInfo.exists) {
                  await FileSystem.deleteAsync(uri);
                }
              } catch (fileError) {
                console.error('Error deleting file:', fileError);
              }
              
              // Show success toast
              Toast.show({
                type: 'success',
                text1: 'Model Deleted',
                position: 'bottom',
                visibilityTime: 2000,
              });
              
            } catch (error) {
              console.error('Failed to delete model:', error);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Could not delete the model',
                position: 'bottom',
                visibilityTime: 3000,
              });
              loadModels(); // Reload if failed
            }
          }
        }
      ]
    );
  };

  // Function to save the current model
  const saveCurrentModel = async () => {
    if (!currentImage) {
      Toast.show({
        type: 'error',
        text1: 'No image available',
        text2: 'Please upload an image first',
        position: 'bottom',
        visibilityTime: 2000,
      });
      return;
    }
    
    try {
      // Create permanent file path
      const timestamp = Date.now();
      const fileExtension = currentImage.split('.').pop() || 'jpg';
      const permanentFilename = `model-${timestamp}.${fileExtension}`;
      const permanentUri = `${FileSystem.documentDirectory}${permanentFilename}`;
      
      // Copy image to permanent location
      console.log(`Copying model image from ${currentImage} to ${permanentUri}`);
      await FileSystem.copyAsync({ from: currentImage, to: permanentUri });
      console.log('Model image copied successfully.');
      
      // Create model object with auto-generated name
      const modelDate = new Date(timestamp);
      const formattedDate = `${modelDate.getDate()}.${modelDate.getMonth() + 1}.${modelDate.getFullYear()}`;
      const formattedTime = `${modelDate.getHours()}:${modelDate.getMinutes()}`;
      
      const newModel = {
        id: timestamp.toString(),
        name: `Model ${formattedDate} ${formattedTime}`,
        uri: permanentUri,
      };
      
      // Update AsyncStorage
      const existingModelsString = await AsyncStorage.getItem(SAVED_MODELS_KEY);
      const existingModels = existingModelsString ? JSON.parse(existingModelsString) : [];
      const updatedModels = [newModel, ...existingModels];
      
      await AsyncStorage.setItem(SAVED_MODELS_KEY, JSON.stringify(updatedModels));
      console.log('Saved models list updated in AsyncStorage.');
      
      // Update local state to show the new model
      setModels(updatedModels);
      
      // Show toast message and close modal
      Toast.show({
        type: 'success',
        text1: 'Model Saved',
        text2: 'Model has been saved successfully',
        position: 'bottom',
        visibilityTime: 2000,
      });
      
      // Close modal after small delay
      setTimeout(() => {
        onClose();
      }, 500);
      
    } catch (error) {
      console.error('Failed to save model:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not save the model. Please try again.',
        position: 'bottom',
        visibilityTime: 3000,
      });
    }
  };

  const renderModelItem = ({ item }: { item: SavedModel }) => (
    <TouchableOpacity 
        style={[styles.itemContainer, { width: itemWidth, height: itemWidth * 1.5 }]} // Increased height ratio
        activeOpacity={0.8}
        onPress={() => handleSelectModel(item.uri)}
        onLongPress={() => deleteModel(item.id, item.uri)}
    >
        <View style={styles.thumbnailWrapper}>
            <Image source={{ uri: item.uri }} style={styles.thumbnail} resizeMode="contain" />
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => deleteModel(item.id, item.uri)}
            >
              <Trash size={16} color="#FFFFFF" />
            </TouchableOpacity>
        </View>
        <View style={styles.itemInfo}>
            <Text style={styles.modelName} numberOfLines={1}>{item.name}</Text>
        </View>
    </TouchableOpacity>
  );

  return (
    <>
      <Modal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.safeAreaContainer}> 
          <View style={styles.modalContentContainer}>
            <View style={styles.header}>
              <Text style={styles.title}>Select a Model</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            {/* Add Save Current Model button */}
            <TouchableOpacity 
              style={styles.saveCurrentButton}
              onPress={() => {
                if (!currentImage) {
                  Toast.show({
                    type: 'error',
                    text1: 'No image available',
                    text2: 'Please upload an image first',
                    position: 'bottom',
                    visibilityTime: 2000,
                  });
                  return;
                }
                saveCurrentModel();
              }}
            >
              <Save size={16} color="#FFFFFF" />
              <Text style={styles.saveCurrentButtonText}>Save Current Model</Text>
            </TouchableOpacity>

            {isLoading ? (
              <View style={styles.centered}><ActivityIndicator size="large" color="#FFFFFF" /></View>
            ) : models.length === 0 ? (
              <View style={styles.centered}>
                <Text style={styles.placeholderText}>No Saved Models</Text>
                <Text style={styles.placeholderSubText}>Save a model from the "Save Current Model" button above.</Text>
              </View>
            ) : (
              <FlatList
                data={models}
                renderItem={renderModelItem}
                keyExtractor={(item) => item.id}
                numColumns={numColumns}
                key={numColumns} // Re-render if numColumns changes
                contentContainerStyle={styles.listContentContainer}
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  safeAreaContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.4)', // Darker semi-transparent background for backdrop
  },
  modalContentContainer: {
    width: '90%',
    height: '75%',
    backgroundColor: '#FFFFFF', // White background for modal content
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0', // Light gray border
    backgroundColor: '#F8F8F8', // Very light gray for header
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000', // Black title text
  },
  closeButton: {
    padding: 5,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF', // Ensure centered content has white background
  },
  placeholderText: {
    fontSize: 16,
    color: '#555555', // Dark gray text
    textAlign: 'center',
    marginBottom: 8,
  },
  placeholderSubText: {
    fontSize: 14,
    color: '#777777', // Medium gray text
    textAlign: 'center',
  },
  listContentContainer: {
    padding: 5,
    backgroundColor: '#FFFFFF', // White background for list
  },
  itemContainer: {
    margin: 5,
    backgroundColor: '#F0F0F0', // Light gray for item background
    borderRadius: 10,
    overflow: 'hidden',
  },
  thumbnailWrapper: {
    width: '100%',
    height: '85%',
    backgroundColor: '#E0E0E0', // Lighter gray for image background
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  itemInfo: {
    height: '15%',
    paddingVertical: 4,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0', // Match item background
  },
  modelName: {
    fontSize: 12,
    color: '#000000', // Black text for model name
    fontWeight: '500',
    textAlign: 'center',
  },
  saveCurrentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    marginHorizontal: 15,
    marginVertical: 10,
    paddingVertical: 12,
    borderRadius: 8,
  },
  saveCurrentButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.8)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ModelSelectorModal; 