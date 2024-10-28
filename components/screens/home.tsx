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
import { Ionicons } from '@expo/vector-icons';
import { ChatInterface } from '../interfaces/chat';
import { VoiceInterface } from '../interfaces/voice';
import { useSupabaseSession } from '../../lib/hook';
import { VoiceTextToggleButton } from '../interfaces/voice/toggle';
import { ChatInput } from './input';
import Waveform from '../interfaces/voice/waveform';

type EasingFunction = (value: number) => number;
type KeyboardEasing = 'easeInOut' | 'easeIn' | 'easeOut' | 'linear';

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

  const [agentAudioLevel, setAgentAudioLevel] = useState<number>(0.0);
  const [userAudioLevel, setUserAudioLevel] = useState<number>(0.0);

  const session = useSupabaseSession();

  const chatInputOpacity = useRef(new Animated.Value(mode === 'text' ? 1 : 0)).current;
  const waveformOpacity = useRef(new Animated.Value(mode === 'voice' ? 1 : 0)).current;
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
    const OFFSET = 30;
    const newPaddingBottom = keyboardHeight - OFFSET > 0 ? keyboardHeight - OFFSET : 0;
    const easingFunction = easingMapping[easing as KeyboardEasing] || Easing.out(Easing.ease);

    Animated.timing(animatedPaddingBottom, {
      toValue: newPaddingBottom,
      duration: duration || 300,
      easing: easingFunction,
      useNativeDriver: false,
    }).start();
  };

  const handleKeyboardHide = (event: any) => {
    const { duration, easing } = event;
    const easingFunction = easingMapping[easing as KeyboardEasing] || Easing.out(Easing.ease);

    Animated.timing(animatedPaddingBottom, {
      toValue: 0,
      duration: duration || 300,
      easing: easingFunction,
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(chatInputOpacity, {
        toValue: mode === 'text' ? 1 : 0,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(waveformOpacity, {
        toValue: mode === 'voice' ? 1 : 0,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [mode]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Animated.View style={[styles.innerContainer, { paddingBottom: animatedPaddingBottom }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={() => router.push('/settings')}>
              <Ionicons name="settings-outline" size={24} color="blue" />
            </TouchableOpacity>
          </View>

          <View style={styles.mainContent}>
            {mode === 'voice' ? (
              session.session && (
                <VoiceInterface
                  session={session.session}
                  setUserAudioLevel={setUserAudioLevel}
                  setAgentAudioLevel={setAgentAudioLevel}
                />
              )
            ) : (
              <ChatInterface />
            )}
          </View>

          <View style={styles.bottomContainer}>
            <VoiceTextToggleButton mode={mode} onToggle={onToggle} />
            
            <View style={styles.inputWrapper}>
              <Animated.View
                style={[
                  styles.overlayContainer,
                  {
                    opacity: waveformOpacity,
                    zIndex: mode === 'voice' ? 1 : 0,
                  },
                ]}
                pointerEvents={mode === 'voice' ? 'auto' : 'none'}
              >
                <Waveform audioLevel={userAudioLevel} />
              </Animated.View>

              <Animated.View
                style={[
                  styles.overlayContainer,
                  {
                    opacity: chatInputOpacity,
                    zIndex: mode === 'text' ? 1 : 0,
                  },
                ]}
                pointerEvents={mode === 'text' ? 'auto' : 'none'}
              >
                <ChatInput onSend={() => {}} />
              </Animated.View>
            </View>
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 10,
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
  bottomContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
    minHeight: 40,
    marginLeft: 8,
  },
  overlayContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
});

export default HomeScreen;