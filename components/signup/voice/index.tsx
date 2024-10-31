import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert, // Optional: For user-friendly error messages
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { signupStyles, theme } from '../../../lib/style';

type VoiceName = 'Charlotte' | 'Brian' | 'Jessica' | 'George' | 'Matilda' | 'Charlie';

type Props = {
  voice: string | null;
  setVoice: React.Dispatch<React.SetStateAction<string>>;
  setAIName: React.Dispatch<React.SetStateAction<string>>;
  onNext: () => void;
};

export const VoiceNameMapping: Record<VoiceName, string> = {
  'Charlotte': 'voice_1',
  'Brian': 'voice_2',
  'Jessica': 'voice_3',
  'George': 'voice_4',
  'Matilda': 'voice_5',
  'Charlie': 'voice_6'
};

export const VoiceNames: VoiceName[] = Object.keys(VoiceNameMapping) as VoiceName[];

const styles = StyleSheet.create({
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridButton: {
    width: '48%',
    marginVertical: 5,
  },
});

const audioFiles: Record<VoiceName, any> = {
  'Charlotte': require('../../../assets/voices/charlotte.mp3'),
  'Brian': require('../../../assets/voices/brian.mp3'),
  'Jessica': require('../../../assets/voices/jessica.mp3'),
  'George': require('../../../assets/voices/george.mp3'),
  'Matilda': require('../../../assets/voices/matilda.mp3'),
  'Charlie': require('../../../assets/voices/charlie.mp3'),
};

export const VoiceSelector: React.FC<Props> = ({ voice, setVoice, onNext, setAIName }) => {
  const soundRef = useRef<Audio.Sound | null>(null);

  const playVoiceAudio = async (selectedVoice: VoiceName) => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(audioFiles[selectedVoice]);
      soundRef.current = sound;

      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch (error) {
      console.log('Error playing sound:', error);
      Alert.alert('Playback Error', 'Unable to play the selected voice.');
    }
  };

  const handleVoiceSelect = async (selectedVoice: VoiceName) => {
    setVoice(selectedVoice);
    setAIName(selectedVoice);
    await playVoiceAudio(selectedVoice);
  };

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.stopAsync();
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  return (
    <View style={signupStyles.container}>
      <View style={signupStyles.sectionContent}>
        <View />
        <View style={signupStyles.sectionMainContent}>
          <Text style={theme.title}>Select a voice</Text>
          <View style={styles.buttonGrid}>
            {VoiceNames.map((v) => (
              <TouchableOpacity
                key={v}
                style={[
                  theme.button,
                  styles.gridButton,
                  voice === v && theme.selectedButton,
                ]}
                onPress={() => handleVoiceSelect(v)}
                accessible={true}
                accessibilityLabel={`Select ${v}`}
              >
                <Text
                  style={[
                    theme.buttonText,
                    voice === v && theme.selectedButtonText,
                  ]}
                >
                  {v}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <TouchableOpacity
          disabled={!voice}
          style={signupStyles.confirmButton}
          onPress={onNext}
          accessible={true}
          accessibilityLabel="Confirm"
        >
          <Text style={signupStyles.confirmButtonText}>Confirm</Text>
        </TouchableOpacity>          
      </View>
    </View>
  );
};
