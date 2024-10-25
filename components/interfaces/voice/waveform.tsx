// VoiceWaveform.tsx

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Platform,
} from 'react-native';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';

const { width } = Dimensions.get('window');

const NUM_BARS = Math.floor(width / (5 + 3)); // BAR_WIDTH + BAR_MARGIN
const BAR_WIDTH = 5; // Width of each bar
const BAR_MARGIN = 3; // Margin between bars
const MAX_BAR_HEIGHT = 100; // Maximum height of a bar in pixels
const SMOOTHING_FACTOR = 0.8; // Smoothing factor for audio levels (0 < factor <= 1)

export const VoiceWaveform: React.FC = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioLevels, setAudioLevels] = useState<number[]>([]);
  const animatedValues = useRef<Animated.Value[]>([]).current;
  const smoothing = useRef<number[]>([]).current;
  const recording = useRef<Audio.Recording | null>(null);

  // Initialize animated values and smoothing buffer
  useEffect(() => {
    if (animatedValues.length === 0) {
      for (let i = 0; i < NUM_BARS; i++) {
        animatedValues.push(new Animated.Value(0));
        smoothing.push(0);
      }
    }
  }, []);

  // Request microphone permissions and start recording
  useEffect(() => {
    const initRecording = async () => {
      try {
        // Request permissions
        const permission = await Audio.requestPermissionsAsync();
        if (permission.status !== 'granted') {
          console.warn('Microphone permission not granted');
          return;
        }

        // Set audio mode
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          shouldDuckAndroid: false,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          playThroughEarpieceAndroid: false,
        });

        // Initialize recording
        const rec = new Audio.Recording();
        recording.current = rec;

        // Prepare to record with metering enabled
        await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        await rec.startAsync();
        setIsRecording(true);

        // Listen to recording status updates
        rec.setOnRecordingStatusUpdate((status) => {
          if (status.isRecording && typeof status.metering === 'number') {
            const level = status.metering; // Metering is between 0 (silence) and 1 (max)
            updateAudioLevels(level);
          }
        });

      } catch (error) {
        console.error('Failed to start recording', error);
      }
    };

    initRecording();

    // Cleanup on unmount
    return () => {
      const stopRecording = async () => {
        if (recording.current) {
          try {
            await recording.current.stopAndUnloadAsync();
            setIsRecording(false);
          } catch (error) {
            console.error('Failed to stop recording', error);
          }
        }
      };
      stopRecording();
    };
  }, []);

  /**
   * Updates the audio levels and animates the waveform.
   * @param {number} level - The current audio level (0 to 1).
   */
  const updateAudioLevels = (level: number) => {
    setAudioLevels((prevLevels) => {
      const newLevels = [...prevLevels, level];
      if (newLevels.length > NUM_BARS) {
        newLevels.shift();
      }

      // Apply smoothing to the audio levels
      const smoothedLevels = newLevels.map((lvl, index) => {
        smoothing[index] = SMOOTHING_FACTOR * smoothing[index] + (1 - SMOOTHING_FACTOR) * lvl;
        return smoothing[index];
      });

      // Animate each bar's scaleY based on the smoothed audio level
      smoothedLevels.forEach((lvl, index) => {
        Animated.timing(animatedValues[index], {
          toValue: lvl,
          duration: 200,
          easing: Easing.ease,
          useNativeDriver: true, // Enable native driver for better performance
        }).start();
      });

      return newLevels;
    });
  };

  /**
   * Renders the animated waveform.
   * @returns {JSX.Element} - The waveform component.
   */
  const renderWaveform = () => {
    const bars = animatedValues.map((animatedScale, index) => {
      return (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              transform: [{ scaleY: animatedScale }],
            },
          ]}
        />
      );
    });

    return <View style={styles.waveformContainer}>{bars}</View>;
  };

  return (
    <View style={styles.container}>
      {renderWaveform()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: MAX_BAR_HEIGHT + 20, // Adding padding
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    backgroundColor: '#EFE5FF', // Match your app's background
    padding: 10,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bar: {
    width: BAR_WIDTH,
    height: MAX_BAR_HEIGHT,
    marginHorizontal: BAR_MARGIN / 2,
    backgroundColor: '#4A90E2', // Waveform color
    borderRadius: BAR_WIDTH / 2,
  },
});

export default VoiceWaveform;
