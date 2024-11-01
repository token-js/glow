import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';

const DOT_SIZE = 8;
const DOT_MARGIN = 4;
const ANIMATION_DURATION = 300;

export const TypingIndicator: React.FC = () => {
  const animation1 = useRef(new Animated.Value(0)).current;
  const animation2 = useRef(new Animated.Value(0)).current;
  const animation3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (animation: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animation, {
            toValue: -5, // Move up by 5 units
            duration: ANIMATION_DURATION,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.quad),
          }),
          Animated.timing(animation, {
            toValue: 0, // Move back to original position
            duration: ANIMATION_DURATION,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.quad),
          }),
          Animated.delay(ANIMATION_DURATION * 2), // Wait for the other dots
        ]),
        {
          iterations: -1,
        }
      ).start();
    };

    createAnimation(animation1, 0);
    createAnimation(animation2, ANIMATION_DURATION * 1.1);
    createAnimation(animation3, ANIMATION_DURATION * 2.2);

    // Cleanup animations on unmount
    return () => {
      animation1.stopAnimation();
      animation2.stopAnimation();
      animation3.stopAnimation();
    };
  }, [animation1, animation2, animation3]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.dot,
          { transform: [{ translateY: animation1 }] },
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          { transform: [{ translateY: animation2 }] },
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          { transform: [{ translateY: animation3 }] },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: '#999',
    marginHorizontal: DOT_MARGIN,
  },
});
