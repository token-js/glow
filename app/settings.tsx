// app/settings.js
import React from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function SettingsScreen() {
  const router = useRouter();

  // Function to handle logout
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Logout Failed', 'An error occurred while trying to log out. Please try again.');
      console.error('Logout error:', error.message);
    } else {
      Alert.alert('Logged Out', 'You have been successfully logged out.');
      // Navigate to the login screen
      // Replace '/login' with your actual login screen route if different
      router.replace('/');
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Settings',
          headerBackTitle: 'Back', // Set the back button label
          // headerBackTitleVisible: false, // Uncomment to hide the back button label
        }}
      />
      <View style={styles.container}>
        <Text style={styles.title}>Settings Page</Text>
        {/* Add your other settings options here */}
        
        {/* Logout Button */}
        <View style={styles.logoutButton}>
          <Button title="Logout" onPress={handleLogout} color="#FF3B30" />
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
