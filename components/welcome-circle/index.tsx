// components/AnimatedCircle.tsx
import React, { useRef, useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface AnimatedCircleProps {
  text: string;
}

const AnimatedCircle: React.FC<AnimatedCircleProps> = ({ text }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scaleAnim]);

  return (
    <View style={styles.container}>
      {/* Animated Circle */}
      <Animated.View
        style={[
          styles.circle,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      />
      {/* Fixed Size View for Centered Text */}
      <View style={styles.textContainer}>
        <Text style={styles.circleText}>{text}</Text>
      </View>
    </View>
  );
};

export { AnimatedCircle };

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  circle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'skyblue',
    position: 'absolute', // Ensure circle is behind the text
  },
  textContainer: {
    width: 150, // Same width as the circle
    height: 150, // Same height as the circle
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  circleText: {
    color: 'black',
    fontSize: 20, // Adjust as needed
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
