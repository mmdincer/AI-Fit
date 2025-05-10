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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { X } from 'lucide-react-native';

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
}

const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({ visible, onClose, onSelect }) => {
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

  const renderModelItem = ({ item }: { item: SavedModel }) => (
    <TouchableOpacity 
        style={[styles.itemContainer, { width: itemWidth, height: itemWidth * 1.5 }]} // Increased height ratio
        activeOpacity={0.8}
        onPress={() => handleSelectModel(item.uri)}
    >
        <View style={styles.thumbnailWrapper}>
            <Image source={{ uri: item.uri }} style={styles.thumbnail} resizeMode="contain" />
        </View>
        <View style={styles.itemInfo}>
            <Text style={styles.modelName} numberOfLines={1}>{item.name}</Text>
        </View>
    </TouchableOpacity>
  );

  return (
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

          {isLoading ? (
            <View style={styles.centered}><ActivityIndicator size="large" color="#FFFFFF" /></View>
          ) : models.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.placeholderText}>No Saved Models</Text>
              <Text style={styles.placeholderSubText}>Save a model from the Home screen first.</Text>
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
});

export default ModelSelectorModal; 