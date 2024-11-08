// components/AnimatedCircle.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface AnimatedCircleProps {
  text: string;
  scale: number;
  minScale?: number;
  animationDuration?: number; // Optional prop to control animation speed
}

const AnimatedCircle: React.FC<AnimatedCircleProps> = ({
  text,
  scale,
  minScale = 0.5,
  animationDuration = 300, // Default duration is 300ms
}) => {
  // Internal Animated.Value for smooth transitions
  const animatedScale = useRef(new Animated.Value(scale)).current;

  useEffect(() => {
    Animated.timing(animatedScale, {
      toValue: scale,
      duration: animationDuration,
      useNativeDriver: true,
    }).start();
  }, [scale, animationDuration, animatedScale]);

  // Add minScale to ensure minimum size
  const finalScale = animatedScale.interpolate({
    inputRange: [0, 1],
    outputRange: [minScale, minScale + 1],
  });

  return (
    <View style={styles.container}>
      {/* Animated Circle */}
      <Animated.View
        style={[
          styles.circle,
          {
            transform: [{ scale: finalScale }],
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
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  circleText: {
    color: 'black',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
