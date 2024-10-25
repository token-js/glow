// HomeScreen.tsx

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Keyboard,
  Platform,
  SafeAreaView,
  TouchableWithoutFeedback,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AnimatedCircle } from '../welcome-circle';
import { Ionicons } from '@expo/vector-icons';
import { ChatInterface } from '../interfaces/chat';
import { VoiceInterface } from '../interfaces/voice';
import { useSupabaseSession } from '../../lib/hook';
import { VoiceTextToggleButton } from '../interfaces/voice/toggle';
import { ChatInput } from './input';
import { VoiceWaveform } from '../interfaces/voice/waveform'

// Define a type for EasingFunction
type EasingFunction = (value: number) => number;

// Define a type for supported easing strings from keyboard events
type KeyboardEasing = 'easeInOut' | 'easeIn' | 'easeOut' | 'linear';

// Create a mapping from KeyboardEasing to React Native Easing functions
const easingMapping: Record<KeyboardEasing, EasingFunction> = {
  easeInOut: Easing.inOut(Easing.ease),
  easeIn: Easing.in(Easing.ease),
  easeOut: Easing.out(Easing.ease),
  linear: Easing.linear,
};

export const HomeScreen: React.FC = () => {
  const [mode, setMode] = useState<'text' | 'voice'>('voice');
  const router = useRouter();
  const onToggle = () => setMode(mode === 'text' ? 'voice' : 'text');

  const getStartedPrompt =
    mode === 'voice'
      ? 'Start talking to get started'
      : 'Send a message to get started';
  const session = useSupabaseSession();

  // Animated value for bottom padding
  const animatedPaddingBottom = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let keyboardShowListener: any;
    let keyboardHideListener: any;

    if (Platform.OS === 'ios') {
      keyboardShowListener = Keyboard.addListener('keyboardWillShow', handleKeyboardShow);
      keyboardHideListener = Keyboard.addListener('keyboardWillHide', handleKeyboardHide);
    } else {
      keyboardShowListener = Keyboard.addListener('keyboardDidShow', handleKeyboardShow);
      keyboardHideListener = Keyboard.addListener('keyboardDidHide', handleKeyboardHide);
    }

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, []);

  const handleKeyboardShow = (event: any) => {
    const { duration, easing, endCoordinates } = event;
    const keyboardHeight = endCoordinates.height;

    // Define the offset
    const OFFSET = 30; // Pixels to subtract from keyboard height

    // Calculate the new paddingBottom, ensuring it doesn't go below 0
    const newPaddingBottom = keyboardHeight - OFFSET > 0 ? keyboardHeight - OFFSET : 0;

    // Cast easing to KeyboardEasing type, default to 'easeOut' if undefined
    const easingFunction = easingMapping[easing as KeyboardEasing] || Easing.out(Easing.ease);

    Animated.timing(animatedPaddingBottom, {
      toValue: newPaddingBottom,
      duration: duration || 300,
      easing: easingFunction,
      useNativeDriver: false, // padding is not supported by native driver
    }).start();
  };

  const handleKeyboardHide = (event: any) => {
    const { duration, easing } = event;

    // Cast easing to KeyboardEasing type, default to 'easeOut' if undefined
    const easingFunction = easingMapping[easing as KeyboardEasing] || Easing.out(Easing.ease);

    Animated.timing(animatedPaddingBottom, {
      toValue: 0,
      duration: duration || 300,
      easing: easingFunction,
      useNativeDriver: false,
    }).start();
  };

  // Animated values for ChatInput
  const chatInputOpacity = useRef(new Animated.Value(mode === 'text' ? 1 : 0)).current;

  // Animate ChatInput on mode change
  useEffect(() => {
    Animated.parallel([
      Animated.timing(chatInputOpacity, {
        toValue: mode === 'text' ? 1 : 0,
        duration: 400, // Increased duration for smoother animation
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [mode]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Dismiss Keyboard When Tapping Outside */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Animated.View style={[styles.innerContainer, { paddingBottom: animatedPaddingBottom }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              {/* Placeholder for alignment */}
            </View>

            {/* Settings Button */}
            <TouchableOpacity onPress={() => router.push('/settings')}>
              <Ionicons name="settings-outline" size={24} color="blue" />
            </TouchableOpacity>
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            {mode === 'voice' ? (
              session.session && <VoiceInterface session={session.session} />
            ) : (
              <ChatInterface />
            )}
          </View>

          {/* Custom Text Switch and ChatInput */}
          <View style={styles.switchContainer}>
            <VoiceTextToggleButton mode={mode} onToggle={onToggle} />
            <VoiceWaveform />
            {/* <Animated.View
              style={[
                styles.inputContainer,
                {
                  opacity: chatInputOpacity,
                },
              ]}
              pointerEvents={mode === 'text' ? 'auto' : 'none'} // Prevent interaction when hidden
            >
              <ChatInput onSend={() => {}} />
            </Animated.View> */}
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EFE5FF', // Ensure background is consistent
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'space-between', // Distribute space between main content and input
    paddingHorizontal: 10, // Optional: Adjust based on design
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    justifyContent: 'space-between',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleContainer: {
    // Removed absolute positioning to allow layout to adjust with padding
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: {
    flex: 1, // Allow ChatInput to take up available space
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginRight: 0, // Optional: Adjust spacing between ChatInput and Toggle Button
  },
});

export default HomeScreen;
