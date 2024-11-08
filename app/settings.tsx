import React from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function SettingsScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    supabase.auth.onAuthStateChange(async () => {
      router.replace('/');
    });

    try {
      const { error } = await supabase.auth.signOut()
      console.error(error)
      if (error) throw error;
    } catch (error: any) {
      Alert.alert(
        'Logout Failed',
        'An error occurred while trying to log out. Please try again.'
      );
      console.error('Logout error:', error.message);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Settings',
          headerBackTitle: 'Back',
        }}
      />
      <View style={styles.container}>
        <View style={styles.logoutButton}>
          <Button 
            title="Logout" 
            onPress={handleLogout} 
            color="#FF3B30" 
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  logoutButton: {
    marginTop: 30,
    width: '80%',
  },
});