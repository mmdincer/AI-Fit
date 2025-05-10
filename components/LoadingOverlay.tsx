import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, StyleSheet, Text, Animated } from 'react-native';
import LottieView from 'lottie-react-native';

interface LoadingOverlayProps {
  visible: boolean;
}

// Fashion tips array
const fashionTips = [
  "Did you know? The 'Little Black Dress' was popularized by Coco Chanel in the 1920s.",
  "Denim jeans were originally workwear for laborers in the American West during the Gold Rush.",
  "The mini skirt, a symbol of 1960s youth culture, was pioneered by designer Mary Quant.",
  "High heels were originally worn by Persian soldiers in the 10th century to help secure their feet in stirrups.",
  "The T-shirt evolved from undergarments used in the 19th century and became popular after being worn by US Navy members.",
  "The bikini, introduced in 1946, was named after the Bikini Atoll, where atomic bomb tests were taking place.",
  "Sneakers gained popularity in the early 20th century with the rise of athletic activities.",
];

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ visible }) => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current; // Ref for fade animation

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    if (visible) {
      // Start with a random tip
      setCurrentTipIndex(Math.floor(Math.random() * fashionTips.length));
      fadeAnim.setValue(1); // Ensure opacity is 1 when starting

      // Set interval to change tip every 5 seconds
      intervalId = setInterval(() => {
        // Fade out
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500, // Fade out duration
          useNativeDriver: true,
        }).start(() => {
          // Change tip after fade out
          setCurrentTipIndex(prevIndex => (prevIndex + 1) % fashionTips.length);
          // Fade in
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500, // Fade in duration
            useNativeDriver: true,
          }).start();
        });
      }, 5000); // Change tip every 5 seconds

    } else {
      // Clear interval if overlay is not visible
      if (intervalId) {
        clearInterval(intervalId);
      }
    }

    // Cleanup function to clear interval when component unmounts or visibility changes
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [visible, fadeAnim]);

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      onRequestClose={() => {}}
    >
      <View style={styles.overlayContainer}>
        <View style={styles.contentContainer}>
          <LottieView
            source={require('@/assets/animations/loading_animation.json')}
            autoPlay
            loop
            style={styles.lottieAnimation}
          />
          <Animated.Text style={[styles.tipText, { opacity: fadeAnim }]}> 
            {fashionTips[currentTipIndex]}
          </Animated.Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Lighter semi-transparent white background
  },
  contentContainer: {
    padding: 30,
    backgroundColor: '#FFFFFF', // White background for content
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: {
        width: 0,
        height: 1, // Softer shadow
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 5,
    marginHorizontal: 40,
  },
  lottieAnimation: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  tipText: { 
    marginTop: 15,
    color: '#333333', // Darker text color for white background
    fontSize: 15,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 22,
  },
});

export default LoadingOverlay; 