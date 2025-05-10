import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Save, XCircle } from 'lucide-react-native';

interface SaveModelModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  onSave: (name: string) => void; // Callback returns the entered name
}

const SaveModelModal: React.FC<SaveModelModalProps> = ({ visible, imageUri, onClose, onSave }) => {
  const [modelName, setModelName] = useState('');

  // Clear input when modal opens
  useEffect(() => {
    if (visible) {
      setModelName('');
    }
  }, [visible]);

  const handleSavePress = () => {
    if (modelName.trim()) {
      onSave(modelName.trim());
    } else {
      // Optionally show an inline validation message instead of Alert
      alert('Please enter a name for the model.'); 
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      {/* KeyboardAvoidingView helps prevent the keyboard from covering the input */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={styles.keyboardAvoidingContainer}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentContainer}>
            <Text style={styles.modalTitle}>Save Body Model</Text>

            {imageUri && (
              <View style={styles.previewContainer}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
              </View>
            )}

            <TextInput
              style={styles.modalInput}
              placeholder="Enter a name (e.g., Standing Pose)"
              placeholderTextColor="#8E8E93"
              value={modelName}
              onChangeText={setModelName}
              autoFocus={true}
            />

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <XCircle size={18} color="#333333" />
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalSaveButton, !modelName.trim() && styles.modalSaveButtonDisabled ]}
                onPress={handleSavePress} 
                activeOpacity={0.7}
                disabled={!modelName.trim()} // Disable save if name is empty
              >
                <Save size={18} color="#FFFFFF" />
                <Text style={[styles.modalButtonText, styles.saveButtonText]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
      flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Standard darker overlay for light theme
  },
  modalContentContainer: {
    width: '88%',
    padding: 20,
    paddingTop: 25,
    backgroundColor: '#FFFFFF', // White background for modal content
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000', // Black title text
    marginBottom: 15,
  },
  previewContainer: {
      width: '60%',
      aspectRatio: 3/4,
      marginBottom: 20,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: '#E0E0E0', // Light gray for image background
      borderWidth: 1,
      borderColor: '#CCCCCC', // Lighter border
  },
  previewImage: {
      width: '100%',
      height: '100%',
  },
  modalInput: {
    width: '100%',
    backgroundColor: '#F0F0F0', // Light gray for input field
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D0D0D0', // Medium gray border
    color: '#000000', // Black text for input
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 25,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 6,
  },
  modalCancelButton: {
    backgroundColor: '#E0E0E0', // Light gray for cancel button
  },
  modalSaveButton: {
    backgroundColor: '#007AFF', // Standard iOS blue for save
  },
  modalSaveButtonDisabled: {
    backgroundColor: '#007AFF',
    opacity: 0.5, // Standard opacity for disabled blue button
  },
  modalButtonText: {
    color: '#000000', // Default to black text for buttons
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  // Specific text color for save button if needed (e.g., if save button is colored)
  saveButtonText: {
    color: '#FFFFFF', // White text on blue save button
  }
});

export default SaveModelModal; 