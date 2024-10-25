import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { AnimatedCircle } from '../welcome-circle';
import { Ionicons } from '@expo/vector-icons';
import { ChatInterface } from '../interfaces/chat';
import { VoiceInterface } from '../interfaces/voice';
import { useSupabaseSession } from '../../lib/hook';
import { VoiceTextToggleButton } from '../interfaces/voice/toggle'
import { ChatInput } from './input'

type HomeDrawerParamList = {
  index: undefined;
};

export const HomeScreen: React.FC = () => {
  const [mode, setMode] = useState<'text' | 'voice'>('voice');
  const router = useRouter();
  const onToggle = () => setMode(mode === 'text' ? 'voice' : 'text');

  const getStartedPrompt = mode === 'voice' ? 'Start talking to get started' : 'Send a message to get started'
  const session = useSupabaseSession()

  return (
    <View style={styles.container}>
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
        <View style={styles.circleContainer}>
          <AnimatedCircle text={getStartedPrompt} />
        </View>
        {mode === 'voice' ? (
          session.session && <VoiceInterface session={session.session} />
        ) : (
          <ChatInterface />
        )}
      </View>

      {/* Custom Text Switch */}
      <View style={styles.switchContainer}>
        <VoiceTextToggleButton mode={mode} onToggle={onToggle} />
        <View style={{
          flex: 9
        }}>
          {mode === 'voice' ? <View /> : <View style={styles.inputContainer}>
            <ChatInput onSend={() => {}} />
          </View>}
        </View>
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
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 30,
    paddingHorizontal: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
});

export default HomeScreen;
