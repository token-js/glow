import {
  segmentTrackLoadedAuthPage,
  segmentTrackSignedIn,
} from "@/lib/analytics";
import { supabase } from "@/lib/supabase";
import { convertSQLToSettings } from "@/lib/utils";
import { Settings } from "@prisma/client";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { Session, User } from "@supabase/supabase-js";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SignInWithGoogle } from "./google";

type Props = {
  setSession: React.Dispatch<React.SetStateAction<Session | null>>;
  setShowSignupFlow: React.Dispatch<React.SetStateAction<boolean>>;
};

export const fetchUserSettings = async (
  userId: string
): Promise<Settings | null> => {
  const { data } = await supabase.from("settings").select().eq("id", userId);

  return convertSQLToSettings(data);
};

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export default function Auth({ setSession, setShowSignupFlow }: Props) {
  GoogleSignin.configure({
    scopes: [],
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_AUTH_CLIENT_ID,
  });

  const handleDidSignin = async (user: User, session: Session) => {
    setSession(session);
    let settings = null;
    while (settings === null) {
      settings = await fetchUserSettings(user.id);
      await sleep(1000);
    }

    // If the user hasn't filled out their profile, then show the signup flow
    if (settings.name === null) {
      setShowSignupFlow(true);
    }

    segmentTrackSignedIn(user.id);
  };

  useEffect(() => {
    segmentTrackLoadedAuthPage();
  }, []);

  return (
    <View style={styles.container}>
      <View
        style={{
          flex: 15,
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: "bold" }}>
          Welcome to Glow
        </Text>
      </View>
      <View style={{ flex: 2, marginBottom: 10 }}>
        {/* <SignInWithApple handleDidSignin={handleDidSignin} /> */}
        <SignInWithGoogle handleDidSignin={handleDidSignin} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end", // Pushes the button to the bottom
    alignItems: "center", // Centers horizontally
    paddingBottom: 40, // Optional: Adds some padding to the bottom
  },
});
