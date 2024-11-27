import { useAudioPlayerContext } from "@/components/audio-player-context";
import { Ionicons } from "@expo/vector-icons";
import { Session } from "@supabase/supabase-js";
import { Audio, AVPlaybackStatus } from "expo-av";
import * as FileSystem from "expo-file-system";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type AudioMessageProps = {
  audioId: string;
  autoplay: boolean;
  session: Session;
};

export const AudioMessage: React.FC<AudioMessageProps> = ({
  audioId,
  autoplay,
  session,
}) => {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const isCancelledRef = useRef<boolean>(false);

  const {
    currentlyPlayingId,
    setCurrentlyPlayingId,
    currentlyLoadingId,
    setCurrentlyLoadingId,
  } = useAudioPlayerContext();

  const loadAndPlayAudio = useCallback(async () => {
    setIsLoading(true);
    setCurrentlyLoadingId(audioId);
    isCancelledRef.current = false;

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
      });

      const localAudioUri = `${FileSystem.documentDirectory}${audioId}.mp3`;

      const fileInfo = await FileSystem.getInfoAsync(localAudioUri);

      let sound: Audio.Sound;
      if (fileInfo.exists) {
        // Load the audio from local storage
        ({ sound } = await Audio.Sound.createAsync({
          uri: localAudioUri,
        }));

        if (isCancelledRef.current) {
          sound.unloadAsync();
          return;
        }
      } else {
        // Fetch the audio from the network
        const headers = {
          Authorization: `Bearer ${session.access_token}`,
        };

        const audioUrl = `https://${process.env.EXPO_PUBLIC_API_URL}/api/fetchAudio?audioId=${audioId}`;

        // Download the audio file to local storage
        await FileSystem.downloadAsync(audioUrl, localAudioUri, {
          headers,
        });

        // Load the audio from the newly saved file
        ({ sound } = await Audio.Sound.createAsync({
          uri: localAudioUri,
        }));

        if (isCancelledRef.current) {
          sound.unloadAsync();
          return;
        }
      }

      setIsLoading(false);
      setCurrentlyLoadingId(null);
      setIsPlaying(true);
      setCurrentlyPlayingId(audioId);

      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying);
          if (status.didJustFinish) {
            sound.unloadAsync();
            soundRef.current = null;
            setCurrentlyPlayingId(null);
          }
        }
      });

      soundRef.current = sound;
    } catch (error) {
      console.error("Error loading audio:", error);
      setIsLoading(false);
      setCurrentlyLoadingId(null);
      setIsPlaying(false);
      setCurrentlyPlayingId(null);
    }
  }, [audioId, session.access_token]);

  useEffect(() => {
    // Pause this audio if another audio starts playing
    if (currentlyPlayingId !== audioId && isPlaying) {
      if (soundRef.current) {
        soundRef.current.pauseAsync();
        setIsPlaying(false);
      }
    }
  }, [currentlyPlayingId, audioId, isPlaying]);

  useEffect(() => {
    // Cancel this audio's loading if another audio starts loading
    if (currentlyLoadingId !== audioId && isLoading) {
      isCancelledRef.current = true;
      setIsLoading(false);
    }
  }, [currentlyLoadingId, audioId, isLoading]);

  useEffect(() => {
    if (autoplay && !soundRef.current) {
      loadAndPlayAudio();
    }

    // Cleanup when the component unmounts
    return () => {
      if (isLoading) {
        isCancelledRef.current = true;
        setIsLoading(false);
        setCurrentlyLoadingId(null);
      }
      if (soundRef.current) {
        soundRef.current.stopAsync();
        soundRef.current.unloadAsync();
        setIsPlaying(false);
        if (currentlyPlayingId === audioId) {
          setCurrentlyPlayingId(null); // Reset context
        }
      }
    };
  }, [autoplay, loadAndPlayAudio]);

  const onPlayPausePress = async () => {
    if (isLoading) {
      // Cancel loading
      isCancelledRef.current = true;
      setIsLoading(false);
      setCurrentlyLoadingId(null);
    } else if (!soundRef.current) {
      // First time loading and playing the audio
      await loadAndPlayAudio();
    } else {
      const status = await soundRef.current.getStatusAsync();

      if (!status.isLoaded) {
        soundRef.current = null;
        await loadAndPlayAudio();
      } else if (status.isPlaying) {
        // If the audio is playing, pause it
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
        if (currentlyPlayingId === audioId) {
          setCurrentlyPlayingId(null); // Reset context
        }
      } else {
        setIsPlaying(true);
        if (currentlyPlayingId !== audioId) {
          setCurrentlyPlayingId(audioId);
        }
        await soundRef.current.playAsync();
      }
    }
  };

  const formatTime = (millis: number | null) => {
    if (millis === null) return "0:00";
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <View style={styles.audioContainer}>
      <TouchableOpacity onPress={onPlayPausePress} style={styles.playButton}>
        {isLoading ? (
          <Ionicons name="download" size={24} color="#fff" />
        ) : (
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={24}
            color="#fff"
          />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  audioContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    padding: 10,
    marginVertical: 5,
    maxWidth: "80%",
    alignSelf: "flex-start",
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  timeText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#000",
  },
});
