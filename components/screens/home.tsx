// app/(home)/index.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Button } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { AnimatedCircle } from '../welcome-circle';
import { TextSwitch } from '../text-switch';
import { Ionicons } from '@expo/vector-icons';
import { DrawerNavigationProp } from '@react-navigation/drawer';

type HomeDrawerParamList = {
  index: undefined;
};

export const HomeScreen: React.FC = () => {
  const [mode, setMode] = useState<"text" | "voice">('voice')
  const navigation = useNavigation<DrawerNavigationProp<HomeDrawerParamList>>();
  const router = useRouter();

  const onToggle = () => setMode(mode === 'text' ? 'voice' : 'text')

  const handleNotSurePress = () => {
    console.log('Button pressed: Not sure what to say?');
    Alert.alert('Not sure what to say?', 'This is just a demo action.');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* Menu Button */}
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={24} color="blue" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          {/* Placeholder for alignment */}
        </View>

        {/* Settings Button */}
        <TouchableOpacity onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={24} color="blue" />
        </TouchableOpacity>
      </View>

      {/* Animated Circle */}
      <View style={styles.circleContainer}>
        <AnimatedCircle text="Start talking to get started" />
      </View>

      {/* Button */}
      <View style={styles.buttonContainer}>
        <Button title="Not sure what to say?" onPress={handleNotSurePress} />
      </View>

      {/* Custom Text Switch */}
      <View style={styles.switchContainer}>
        <TextSwitch mode={mode} onToggle={onToggle} />
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
});
