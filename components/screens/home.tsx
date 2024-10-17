// app/(home)/index.tsx
import { View, StyleSheet, Text, Alert, TouchableOpacity, Button } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { AnimatedCircle } from '../welcome-circle';
import { TextSwitch } from '../text-switch';
import { Ionicons } from '@expo/vector-icons';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import BottomSheet, {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetModalProvider,
} from '@gorhom/bottom-sheet';
import { SuggestionSheet } from '../suggestion-sheet';

type HomeDrawerParamList = {
  index: undefined;
};

export const HomeScreen: React.FC = () => {
  const [mode, setMode] = useState<"text" | "voice">('voice')
  const navigation = useNavigation<DrawerNavigationProp<HomeDrawerParamList>>();
  const router = useRouter();
  const onToggle = () => setMode(mode === 'text' ? 'voice' : 'text')

  const handlePresentModalPress = useCallback(() => {
    // bottomSheetModalRef.current?.present();
    bottomSheetRef.current?.expand()
  }, []);

  // ref
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

      {/* Animated Circle */}
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

      {/* Custom Text Switch */}
      <View style={styles.switchContainer}>
        <TextSwitch mode={mode} onToggle={onToggle} />
      </View>


      <SuggestionSheet
        bottomSheetRef={bottomSheetRef}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
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
