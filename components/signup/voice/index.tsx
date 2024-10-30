import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { signupStyles, theme } from '../../../lib/style';

type Props = {
  voice: string | null;
  setVoice: React.Dispatch<React.SetStateAction<string>>;
  onFinish: () => Promise<void>;
};

export const VoiceNameMapping = {
  'Charlotte': 'voice_1',
  'Brian': 'voice_2',
  'Jessica': 'voice_3',
  'George': 'voice_4',
  'Matilda': 'voice_5',
  'Charlie': 'voice_6'
};

export const VoiceNames = Object.keys(VoiceNameMapping);

const styles = StyleSheet.create({
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between', // Optional: Adjusts spacing between buttons
  },
  gridButton: {
    width: '48%', // Two columns (adjust percentage to account for spacing)
    marginVertical: 5, // Optional: Adds vertical spacing between rows
  },
});

export const VoiceSelector: React.FC<Props> = ({ voice, setVoice, onFinish }) => {
  const handleVoiceSelect = async (selectedVoice: string) => {
    setVoice(selectedVoice);
  };

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
          onPress={onFinish}
          accessible={true}
          accessibilityLabel="Confirm"
        >
          <Text style={signupStyles.confirmButtonText}>Confirm</Text>
        </TouchableOpacity>          
      </View>
    </View>
  );
};
