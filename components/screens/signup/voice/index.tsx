import { signupStyles, theme } from "@/lib/style";
import { Audio, AVPlaybackStatus } from "expo-av";
import React, { useEffect, useRef } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type VoiceName = "Mark" | "Amelia" | "Archer" | "Charlotte" | "Paul" | "Dakota";

type Props = {
  voice: string | null;
  setVoice: React.Dispatch<React.SetStateAction<string>>;
  setAIName: React.Dispatch<React.SetStateAction<string>>;
  onNext: () => void;
};

export const VoiceNameMapping: Record<VoiceName, string> = {
  Mark: "voice_1",
  Amelia: "voice_2",
  Archer: "voice_3",
  Charlotte: "voice_4",
  Paul: "voice_5",
  Dakota: "voice_6",
};

export const VoiceNames: VoiceName[] = Object.keys(
  VoiceNameMapping
) as VoiceName[];

const styles = StyleSheet.create({
  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridButton: {
    width: "48%",
    marginVertical: 5,
  },
});

const audioFiles: Record<VoiceName, any> = {
  Mark: require("@/assets/voices/mark.mp3"),
  Amelia: require("@/assets/voices/amelia.mp3"),
  Archer: require("@/assets/voices/archer.mp3"),
  Charlotte: require("@/assets/voices/charlotte.mp3"),
  Paul: require("@/assets/voices/paul.mp3"),
  Dakota: require("@/assets/voices/dakota.mp3"),
};

export const VoicePicker: React.FC<Props> = ({
  voice,
  setVoice,
  setAIName,
}) => {
  const soundRef = useRef<Audio.Sound | null>(null);

  const playVoiceAudio = async (selectedVoice: VoiceName) => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        audioFiles[selectedVoice]
      );
      soundRef.current = sound;

      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch (error) {
      Alert.alert("Playback Error", "Unable to play the selected voice.");
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
            style={[theme.buttonText, voice === v && theme.selectedButtonText]}
          >
            {v}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export const VoiceSelector: React.FC<Props> = ({
  voice,
  setVoice,
  onNext,
  setAIName,
}) => {
  return (
    <View style={signupStyles.container}>
      <View style={signupStyles.sectionContent}>
        <View />
        <View style={signupStyles.sectionMainContent}>
          <Text style={theme.title}>Select a voice</Text>
          <VoicePicker
            voice={voice}
            setVoice={setVoice}
            setAIName={setAIName}
            onNext={onNext}
          />
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
