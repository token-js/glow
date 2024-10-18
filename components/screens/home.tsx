// app/(home)/index.tsx
import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Button } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { AnimatedCircle } from '../welcome-circle';
import { TextSwitch } from '../text-switch';
import { Ionicons } from '@expo/vector-icons';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { ChatInterface } from '../interfaces/chat';
import { SuggestionSheet } from '../suggestion-sheet';
import BottomSheet from '@gorhom/bottom-sheet';
import { VoiceInterface } from '../interfaces/voice';

type HomeDrawerParamList = {
  index: undefined;
};

export const HomeScreen: React.FC = () => {
  const [mode, setMode] = useState<'text' | 'voice'>('voice');
  const navigation = useNavigation<DrawerNavigationProp<HomeDrawerParamList>>();
  const router = useRouter();
  const onToggle = () => setMode(mode === 'text' ? 'voice' : 'text');

  const getStartedPrompt = mode === 'voice' ? 'Start talking to get started' : 'Send a message to get started'

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* Menu Button */}
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color="blue" />
        </TouchableOpacity>

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
        <View style={styles.circleContainer}>
          <AnimatedCircle text={getStartedPrompt} />
        </View>
        {mode === 'voice' ? (
          <VoiceInterface />
        ) : (
          <ChatInterface />
        )}
      </View>

      {/* Custom Text Switch */}
      <View style={styles.switchContainer}>
        <TextSwitch mode={mode} onToggle={onToggle} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  mainContent: {
    flex: 1,
    position: 'relative', // Enable absolute positioning within
  },
  circleContainer: {
    position: 'absolute', // Absolutely positioned within mainContent
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0, // Ensure it's beneath other content
    pointerEvents: 'none', // Allow touches to pass through
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 10,
    justifyContent: 'space-between',
  },
  buttonContainer: {
    marginVertical: 20,
    paddingHorizontal: 20,
    width: '80%',
    alignSelf: 'center',
  },
  switchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 30,
  },
});

export default HomeScreen;
