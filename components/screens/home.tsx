// app/(home)/index.tsx
import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Button } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { AnimatedCircle } from '../welcome-circle';
import { TextSwitch } from '../text-switch';
import { Ionicons } from '@expo/vector-icons';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { ChatScreen } from '../chat';
import { SuggestionSheet } from '../suggestion-sheet';
import BottomSheet from '@gorhom/bottom-sheet';

type HomeDrawerParamList = {
  index: undefined;
};

export const HomeScreen: React.FC = () => {
  const [mode, setMode] = useState<'text' | 'voice'>('voice');
  const navigation = useNavigation<DrawerNavigationProp<HomeDrawerParamList>>();
  const router = useRouter();
  const onToggle = () => setMode(mode === 'text' ? 'voice' : 'text');

  const handlePresentModalPress = useCallback(() => {
    bottomSheetRef.current?.expand();
  }, []);

  const bottomSheetRef = useRef<BottomSheet>(null);

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

      {/* Main Content */}
      <View style={styles.mainContent}>
        {mode === 'voice' ? (
          <>
            {/* Center the AnimatedCircle */}
            <View style={styles.circleContainer}>
              <AnimatedCircle text="Start talking to get started" />
            </View>

            {/* Button */}
            <View style={styles.buttonContainer}>
              <Button
                title="Not sure what to say?"
                onPress={handlePresentModalPress}
              />
            </View>

            {/* Suggestion Sheet */}
            <SuggestionSheet bottomSheetRef={bottomSheetRef} />
          </>
        ) : (
          <ChatScreen />
        )}
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
    paddingTop: 50,
  },
  mainContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 10,
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

export default HomeScreen;
