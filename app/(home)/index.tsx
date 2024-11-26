import Auth, { fetchUserSettings, sleep } from "@/components/screens/auth";
import { HomeScreen } from "@/components/screens/home";
import { SignupFlow } from "@/components/screens/signup";
import { SessionContext } from "@/context/SessionContext"; // Import your SessionContext
import { segmentTrackOpened } from "@/lib/analytics";
import { Settings } from "@prisma/client";
import { Session } from "@supabase/supabase-js";
import React, { useContext, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function App() {
  const { session, loading: sessionLoading } = useContext(SessionContext);
  const [showSignupFlow, setShowSignupFlow] = useState<boolean>(false);
  const [settings, setSettings] = useState<Settings | null>();
  const [loading, setLoading] = useState<boolean>(true);

  const setupSettings = async (userId: string) => {
    setSettings(await fetchUserSettings(userId));
    await sleep(1000);
    setLoading(false);
  };

  const handleSetupSettings = async (currentSession: Session | null) => {
    if (currentSession) {
      segmentTrackOpened(currentSession.user.id);
      setLoading(true);
      await setupSettings(currentSession.user.id);
    } else {
      setSettings(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSetupSettings(session);
  }, [session]);

  const didConfigureSettings =
    settings &&
    settings.agentName !== null &&
    settings.gender !== null &&
    settings.name !== null &&
    settings.voice !== null;

  if (sessionLoading || (session && loading)) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.container}>
        <Auth setShowSignupFlow={setShowSignupFlow} />
      </View>
    );
  } else if (showSignupFlow || !didConfigureSettings) {
    return (
      <View style={styles.container}>
        <SignupFlow
          session={session}
          setShowSignupFlow={setShowSignupFlow}
          setSettings={setSettings}
        />
      </View>
    );
  } else {
    return (
      <View style={styles.container}>
        <HomeScreen />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignContent: "center",
    justifyContent: "center",
  },
});
