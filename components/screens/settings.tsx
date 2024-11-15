import { supabase } from "@/lib/supabase";
import { Stack, useRouter } from "expo-router";
import React from "react";
import { Alert, Button, StyleSheet, View } from "react-native";

export const SettingsScreen = () => {
  const router = useRouter();

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
      <View style={styles.container}>
        <View style={styles.logoutButton}>
          <Button title="Logout" onPress={handleLogout} color="#FF3B30" />
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
