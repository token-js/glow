import {
  fetchUserSettings,
  updateUserSettings,
} from "@/components/screens/auth";
import { AINameInput } from "@/components/screens/signup/aiName";
import { VoiceKey, VoicePicker } from "@/components/screens/signup/voice";
import { signupStyles, theme } from "@/lib/style";
import { supabase } from "@/lib/supabase";
import { Settings } from "@prisma/client";
import { Session } from "@supabase/supabase-js";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export const SettingsScreen = () => {
  const router = useRouter();
  const [voice, setVoice] = useState<VoiceKey | null>(null);
  const [aiName, setAIName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [settings, setSettings] = useState<Settings | null>();
  const [session, setSession] = useState<Session | null>();

  const canSave = settings && session && aiName !== "" && voice !== null;

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
    if (!settings || !session) {
      return;
    }

    if (!canSave) {
      return;
    }

    setLoading(true);

    const { settings: newSettings, error } = await updateUserSettings(
      settings.name!,
      settings.gender!,
      voice!,
      aiName,
      session.user.id!
    );

    setSettings(newSettings);
    setLoading(false);
  };

  const handleLogout = async () => {
    supabase.auth.onAuthStateChange(async () => {
      router.replace("/");
    });

    try {
      await supabase.auth.signOut();
    } catch (error: any) {
      Alert.alert(
        "Logout Failed",
        "An error occurred while trying to log out. Please try again."
      );
      console.error("Logout error:", error.message);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Settings",
          headerBackTitle: "Back",
        }}
      />
      <View
        style={[
          styles.container,
          {
            justifyContent: "space-between",
          },
        ]}
      >
        <View
          style={{
            width: "100%",
          }}
        >
          <Text
            style={[
              theme.title,
              {
                marginBottom: 10,
              },
            ]}
          >
            Companion Voice
          </Text>
          <VoicePicker voice={voice} setVoice={setVoice} />
          <Text
            style={[
              theme.title,
              {
                marginBottom: 10,
              },
            ]}
          >
            Companion Name
          </Text>
          <View
            style={{
              marginBottom: 30,
            }}
          >
            <AINameInput
              aiName={aiName}
              setAIName={setAIName}
              textAlign="left"
            />
          </View>
          <TouchableOpacity
            style={{
              backgroundColor: "#007BFF",
              paddingVertical: 14,
              paddingHorizontal: 40,
              borderRadius: 25,
              alignItems: "center",
              marginBottom: 20,
              width: "auto",
              opacity: canSave ? 1 : 0.5, // Adjust opacity based on canSave
            }}
            onPress={handleSaveSettings}
            accessible={true}
            disabled={!canSave}
            accessibilityLabel="Confirm"
          >
            <Text style={signupStyles.confirmButtonText}>Save Settings</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: "transparent",
            paddingVertical: 14,
            paddingHorizontal: 40,
            borderRadius: 25,
            alignItems: "center",
            width: "100%",
          }}
          onPress={handleLogout}
          accessible={true}
          disabled={!aiName}
          accessibilityLabel="Confirm"
        >
          <Text
            style={{
              color: "red",
              fontSize: 16,
            }}
          >
            Logout
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "flex-start",
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  logoutButton: {
    marginTop: 30,
    width: "80%",
  },
});
