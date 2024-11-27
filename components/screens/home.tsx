import { LoadingChatInterface } from "@/components/chat-interfaces/text";
import { VoiceInterface } from "@/components/chat-interfaces/voice";
import { VoiceTextToggleButton } from "@/components/chat-interfaces/voice/toggle";
import { updateAudioMessages } from "@/components/screens/auth";
import { useSupabaseSession } from "@/lib/hook";
import { Ionicons } from "@expo/vector-icons";
import { Settings } from "@prisma/client";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  Platform,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { ChatInput } from "./input";

type EasingFunction = (value: number) => number;
type KeyboardEasing = "easeInOut" | "easeIn" | "easeOut" | "linear";

const easingMapping: Record<KeyboardEasing, EasingFunction> = {
  easeInOut: Easing.inOut(Easing.ease),
  easeIn: Easing.in(Easing.ease),
  easeOut: Easing.out(Easing.ease),
  linear: Easing.linear,
};

export const HomeScreen: React.FC<{ settings: Settings | null }> = ({
  settings,
}) => {
  const [mode, setMode] = useState<"text" | "voice">("voice");
  const router = useRouter();
  const onToggle = () => setMode(mode === "text" ? "voice" : "text");

  const session = useSupabaseSession();
  const chatInputOpacity = useRef(
    new Animated.Value(mode === "text" ? 1 : 0)
  ).current;
  const waveformOpacity = useRef(
    new Animated.Value(mode === "voice" ? 1 : 0)
  ).current;
  const animatedPaddingBottom = useRef(new Animated.Value(0)).current;
  const chatRef = useRef<any>();
  const [audioMessagesEnabled, setAudioMessagesEnabled] = useState<boolean>(
    settings?.audioMessagesEnabled ?? false
  );
  useEffect(() => {
    let keyboardShowListener: any;
    let keyboardHideListener: any;

    if (Platform.OS === "ios") {
      keyboardShowListener = Keyboard.addListener(
        "keyboardWillShow",
        handleKeyboardShow
      );
      keyboardHideListener = Keyboard.addListener(
        "keyboardWillHide",
        handleKeyboardHide
      );
    } else {
      keyboardShowListener = Keyboard.addListener(
        "keyboardDidShow",
        handleKeyboardShow
      );
      keyboardHideListener = Keyboard.addListener(
        "keyboardDidHide",
        handleKeyboardHide
      );
    }

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, []);

  const handleKeyboardShow = (event: any) => {
    const { duration, easing, endCoordinates } = event;
    const keyboardHeight = endCoordinates.height;
    const OFFSET = 30;
    const newPaddingBottom =
      keyboardHeight - OFFSET > 0 ? keyboardHeight - OFFSET : 0;
    const easingFunction =
      easingMapping[easing as KeyboardEasing] || Easing.out(Easing.ease);

    Animated.timing(animatedPaddingBottom, {
      toValue: newPaddingBottom,
      duration: duration || 300,
      easing: easingFunction,
      useNativeDriver: false,
    }).start();
  };

  const handleAudioMessagesToggled = async (): Promise<void> => {
    if (session.session === null) {
      console.error("Session is null.");
    } else {
      const enabled = !audioMessagesEnabled
      setAudioMessagesEnabled(enabled);
      await updateAudioMessages(session.session.user.id, enabled);
    }
  };

  const handleKeyboardHide = (event: any) => {
    const { duration, easing } = event;
    const easingFunction =
      easingMapping[easing as KeyboardEasing] || Easing.out(Easing.ease);

    Animated.timing(animatedPaddingBottom, {
      toValue: 0,
      duration: duration || 300,
      easing: easingFunction,
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(chatInputOpacity, {
        toValue: mode === "text" ? 1 : 0,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(waveformOpacity, {
        toValue: mode === "voice" ? 1 : 0,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [mode]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View
        style={[
          styles.innerContainer,
          { paddingBottom: animatedPaddingBottom },
        ]}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <>
            <View style={styles.header}>
              <View style={{ flex: 1 }} />
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {mode === "text" && (
                  <TouchableOpacity
                    onPress={handleAudioMessagesToggled}
                    style={[styles.iconButton, { marginRight: 10 }]}
                  >
                    <Ionicons
                      name={
                        audioMessagesEnabled
                          ? "volume-high-outline"
                          : "volume-mute-outline"
                      }
                      size={30}
                      color="black"
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => router.push("/settings")}
                  style={styles.iconButton}
                >
                  <Ionicons name="settings-outline" size={30} color="black" />
                </TouchableOpacity>
              </View>
            </View>

            {session.session && (
              <View style={styles.mainContent}>
                {mode === "voice" ? (
                  <VoiceInterface session={session.session} />
                ) : (
                  <LoadingChatInterface
                    ref={chatRef}
                    session={session.session}
                    userId={session.session.user.id}
                    audioMessagesEnabled={audioMessagesEnabled}
                  />
                )}
              </View>
            )}

            <View style={styles.bottomContainer}>
              <VoiceTextToggleButton mode={mode} onToggle={onToggle} />

              <View style={styles.inputWrapper}>
                <Animated.View
                  style={[
                    styles.overlayContainer,
                    {
                      opacity: chatInputOpacity,
                      zIndex: mode === "text" ? 1 : 0,
                    },
                  ]}
                  pointerEvents={mode === "text" ? "auto" : "none"}
                >
                  <ChatInput chatRef={chatRef} />
                </Animated.View>
              </View>
            </View>
          </>
        </TouchableWithoutFeedback>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 10,
    paddingHorizontal: 10,
    justifyContent: "space-between",
  },
  mainContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  inputWrapper: {
    flex: 1,
    position: "relative",
    height: 50,
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    borderColor: "black",
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default HomeScreen;
