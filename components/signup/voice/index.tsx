import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

type Props = {
  voice: string;
  setVoice: React.Dispatch<React.SetStateAction<string>>;
  onFinish: () => Promise<void>;
};

export const VoiceSelector: React.FC<Props> = ({ voice, setVoice, onFinish }) => {
  const voices = ['Voice 1', 'Voice 2', 'Voice 3'];

  const handleVoiceSelect = async (selectedVoice: string) => {
    setVoice(selectedVoice);
    if (selectedVoice === 'Voice 1') { // Assuming onFinish should be called only for Voice 1
      await onFinish();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Select a voice</Text>
        {voices.map((v) => (
          <TouchableOpacity
            key={v}
            style={[
              styles.button,
              voice === v && styles.selectedButton, // Apply selected style conditionally
            ]}
            onPress={() => handleVoiceSelect(v)}
            accessible={true}
            accessibilityLabel={`Select ${v}`}
          >
            <Text
              style={[
                styles.buttonText,
                voice === v && styles.selectedButtonText, // Optionally change text color
              ]}
            >
              {v}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.confirmButton}
          onPress={onFinish}
          accessible={true}
          accessibilityLabel="Confirm"
        >
          <Text style={styles.buttonText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    position: 'relative',
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    color: '#333',
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    borderWidth: 1,
    borderColor: '#333',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#f0f0f0',
    width: '100%',
  },
  selectedButton: {
    backgroundColor: '#4CAF50', // Change to your desired selected color
    borderColor: '#4CAF50',
  },
  buttonText: {
    color: '#333',
    fontSize: 18,
  },
  selectedButtonText: {
    color: '#fff', // Change text color for better contrast if needed
  },
  confirmButton: {
    borderWidth: 1,
    borderColor: '#333',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
    backgroundColor: '#007BFF', // Different color for confirm button
    width: '100%',
  },
});
