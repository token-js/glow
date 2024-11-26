import {
  fetchUserSettings,
  updateUserSettings,
} from "@/components/screens/auth";
import { AINameInput } from "@/components/screens/signup/aiName";
import { VoiceKey, VoicePicker } from "@/components/screens/signup/voice";
import { AppContext } from "@/context";
import { signupStyles, theme } from "@/lib/style";
import { supabase } from "@/lib/supabase";
import { Settings } from "@prisma/client";
import { Session } from "@supabase/supabase-js";
import { Stack, useRouter } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

export const SettingsScreen = () => {
  const { refetchToken } = useContext(AppContext);
  const router = useRouter();
  const [voice, setVoice] = useState<VoiceKey | null>(null);
  const [aiName, setAIName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [settings, setSettings] = useState<Settings | null>();
  const [didSaveSettings, setDidSaveSettings] = useState<boolean>(true);
  const [session, setSession] = useState<Session | null>();

  useEffect(() => {
    if (settings) {
      setDidSaveSettings(false);
    }
  }, [aiName, voice]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);

      const setupSettings = async (userId: string) => {
        const settings = await fetchUserSettings(userId);
        if (settings) {
          setVoice(settings.voice);
          setAIName(settings.agentName ?? "");
          setSettings(settings);
        }
      };

      if (session?.user.id) {
        setupSettings(session?.user.id);
      }
    });
  }, []);

  const handleSaveSettings = async () => {
    if (!settings || !session) return;

    setLoading(true);

    const { settings: newSettings, error } = await updateUserSettings(
      settings.name!,
      settings.gender!,
      voice!,
      aiName,
      session.user.id!
    );

    if (error) {
      Alert.alert("Error", "Failed to save settings");
    } else {
      setSettings(newSettings);
      setDidSaveSettings(true);
    }

    setLoading(false);
  };

  const handleBack = () => {
    if (didSaveSettings === false) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Do you want to save them before going back?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save",
            onPress: async () => {
              await handleSaveSettings();
              navigateBack(true);
            },
          },
          {
            text: "Discard",
            style: "destructive",
            onPress: async () => {
              navigateBack(false);
            },
          },
        ]
      );
    } else {
      navigateBack(didSaveSettings);
    }
  };

  const navigateBack = async (refresh: boolean) => {
    if (refresh) {
      await refetchToken();
    }

    router.replace({
      pathname: "/",
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Settings",
          headerBackTitle: "Back",
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Icon name="arrow-back" size={28} color="blue" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        <View>
          <Text style={[theme.title, { marginBottom: 10 }]}>
            Companion Voice
          </Text>
          <VoicePicker voice={voice} setVoice={setVoice} />
          <Text style={[theme.title, { marginBottom: 10 }]}>
            Companion Name
          </Text>
          <AINameInput aiName={aiName} setAIName={setAIName} textAlign="left" />
          <TouchableOpacity
            style={{
              backgroundColor: "#007BFF",
              paddingVertical: 14,
              borderRadius: 25,
              alignItems: "center",
              opacity: !didSaveSettings ? 1 : 0.5,
              marginTop: 20,
            }}
            onPress={handleSaveSettings}
            disabled={didSaveSettings}
          >
            <Text style={signupStyles.confirmButtonText}>Save Settings</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={{
            marginTop: 30,
            alignItems: "center",
          }}
          onPress={async () => {
            await supabase.auth.signOut();
            router.replace("/");
          }}
        >
          <Text style={{ color: "red" }}>Logout</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 5,
  },
  backText: {
    marginLeft: 5,
    fontSize: 18,
    color: "blue",
  },
});
