// app/settings.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

export default function SettingsScreen() {
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
        <Text>Settings Page</Text>
        {/* Add your settings options here */}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    alignItems: 'center',
    justifyContent: 'center',
  },
});
