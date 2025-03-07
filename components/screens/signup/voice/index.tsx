import { signupStyles, theme } from "@/lib/style";
import { Audio, AVPlaybackStatus } from "expo-av";
import React, { useEffect, useRef } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type VoiceName = "Mark" | "Amelia" | "Archer" | "Charlotte" | "Paul" | "Dakota";
export type VoiceKey =
  | "voice_1"
  | "voice_2"
  | "voice_3"
  | "voice_4"
  | "voice_5"
  | "voice_6";

type Props = {
  voice: VoiceKey | null;
  setVoice: React.Dispatch<React.SetStateAction<VoiceKey | null>>;
  setAIName: React.Dispatch<React.SetStateAction<string>>;
  onNext: () => void;
};

export const VoiceNameMapping: Record<VoiceName, VoiceKey> = {
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
  },
});

const audioFiles: Record<VoiceName, any> = {
  Mark: require("../../../../assets/voices/mark.mp3"),
  Amelia: require("../../../../assets/voices/amelia.mp3"),
  Archer: require("../../../../assets/voices/archer.mp3"),
  Charlotte: require("../../../../assets/voices/charlotte.mp3"),
  Paul: require("../../../../assets/voices/paul.mp3"),
  Dakota: require("../../../../assets/voices/dakota.mp3"),
};

export const VoicePicker = ({
  voice,
  setVoice,
  setAIName,
}: {
  voice: VoiceKey | null;
  setVoice: React.Dispatch<React.SetStateAction<VoiceKey | null>>;
  setAIName?: React.Dispatch<React.SetStateAction<string>>;
}) => {
  const soundRef = useRef<Audio.Sound | null>(null);

  const playVoiceAudio = async (selectedVoice: VoiceName) => {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
    });

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
    setVoice(VoiceNameMapping[selectedVoice]);
    if (setAIName) {
      setAIName(selectedVoice);
    }
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
            voice === VoiceNameMapping[v] && theme.selectedButton,
          ]}
          onPress={() => handleVoiceSelect(v)}
          accessible={true}
          accessibilityLabel={`Select ${v}`}
        >
          <Text
            style={[
              theme.buttonText,
              voice === VoiceNameMapping[v] && theme.selectedButtonText,
            ]}
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
          <Text
            style={[
              theme.title,
              {
                marginBottom: 20,
              },
            ]}
          >
            Select a voice
          </Text>
          <VoicePicker
            voice={voice}
            setVoice={setVoice}
            setAIName={setAIName}
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
