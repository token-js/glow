import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { selectedButtonColor } from '../../../lib/style';

type Props = {
  mode: 'voice' | 'text';
  onToggle: () => void;
};

export const VoiceTextToggleButton: React.FC<Props> = ({ mode, onToggle }) => {
  // Initialize animated values based on the current mode
  const scaleAnim = useRef(new Animated.Value(mode === 'voice' ? 0 : 1)).current;
  const bgColorAnim = useRef(new Animated.Value(mode === 'voice' ? 0 : 1)).current;

  useEffect(() => {
    // Run the scaling and background color animations in parallel
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: mode === 'voice' ? 0 : 1,
        duration: 300,
        useNativeDriver: true, // Scaling animation uses native driver
      }),
      Animated.timing(bgColorAnim, {
        toValue: mode === 'voice' ? 0 : 1,
        duration: 300,
        useNativeDriver: false, // Background color animation cannot use native driver
      }),
    ]).start();
  }, [mode]);

  // Interpolate scaling values for voice and text icons
  const voiceScale = scaleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const textScale = scaleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Interpolate background color values from light green to transparent
  const backgroundColor = bgColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [selectedButtonColor, 'rgba(144,238,144,0)'], // Light green to transparent
  });

  return (
    <Animated.View style={[styles.button, { backgroundColor }]}>
      <TouchableOpacity onPress={onToggle} style={styles.touchable}>
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: voiceScale }] }]}>
          <Icon name="mic" size={24} color="#000" />
        </Animated.View>
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: textScale }] }]}>
          <Icon name="text-fields" size={24} color="#000" />
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    // Removed backgroundColor since it's now animated
    width: 50,
    height: 50,
    borderRadius: 25,
    elevation: 2, // Adds shadow for Android
    shadowColor: '#000', // Adds shadow for iOS
    shadowOffset: { width: 0, height: 1 }, // Shadow offset
    shadowOpacity: 0.2, // Shadow opacity
    shadowRadius: 1, // Shadow radius
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden', // Ensure content stays within the button
  },
  touchable: {
    flex: 1,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'absolute', // Overlaps the icons
    alignItems: 'center',
    justifyContent: 'center',
  },
});
