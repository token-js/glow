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

export const VoiceSelector: React.FC<Props> = ({ voice, setVoice, onFinish }) => {
  const voices = ['Voice 1', 'Voice 2', 'Voice 3'];

  const handleVoiceSelect = async (selectedVoice: string) => {
    setVoice(selectedVoice);
  };

  return (
    <View style={signupStyles.container}>
      <View style={signupStyles.sectionContent}>
        <View />
        <View style={signupStyles.sectionMainContent}>
          <Text style={theme.title}>Select a voice</Text>
          {voices.map((v) => (
            <TouchableOpacity
              key={v}
              style={[
                theme.button,
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
