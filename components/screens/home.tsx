// HomeScreen.tsx
import React, { useState } from 'react';
import { Link } from 'expo-router';
import { AnimatedCircle } from '../welcome-circle';
import { TextSwitch } from '../text-switch';
import { View, StyleSheet, Alert, TouchableOpacity, Button } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const HomeScreen = () => {
  const [isVoice, setIsVoice] = useState(true);

  const toggleSwitch = () => setIsVoice((previousState) => !previousState);

  const handleNotSurePress = () => {
    console.log("Button pressed: Not sure what to say?");
    Alert.alert("Not sure what to say?", "This is just a demo action.");
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          {/* Placeholder for alignment */}
        </View>
        <Link href="/settings" asChild>
          <TouchableOpacity>
            <Ionicons name="settings-outline" size={24} color="blue" />
          </TouchableOpacity>
        </Link>
      </View>

      {/* Animated Circle */}
      <View style={styles.circleContainer}>
        <AnimatedCircle text={"Start talking to get started"} />
      </View>

      {/* Button */}
      <View style={styles.buttonContainer}>
        <Button title="Not sure what to say?" onPress={handleNotSurePress} />
      </View>

      {/* Custom Text Switch */}
      <View style={styles.switchContainer}>
        <TextSwitch value={isVoice} onValueChange={setIsVoice} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50, // Adjust if necessary for status bar
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  settingsButton: {
    fontSize: 18,
    color: 'blue',
  },
  circleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    marginVertical: 20,
    paddingHorizontal: 20,
    width: '80%',
    alignSelf: 'center',
  },
  switchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 30,
  },
  switchLabel: {
    marginRight: 10,
    fontSize: 18,
  },
});
