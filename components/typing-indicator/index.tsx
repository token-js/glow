import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

const DOT_SIZE = 8;
const DOT_MARGIN = 4;
const ANIMATION_DURATION = 300;

export const TypingIndicator: React.FC = () => {
  const animation1 = useRef(new Animated.Value(0)).current;
  const animation2 = useRef(new Animated.Value(0)).current;
  const animation3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (animation: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animation, {
            toValue: 1,
            duration: ANIMATION_DURATION,
            useNativeDriver: true,
          }),
          Animated.timing(animation, {
            toValue: 0,
            duration: ANIMATION_DURATION,
            useNativeDriver: true,
          }),
        ]),
        { iterations: -1 }
      ).start();
    };

    animateDot(animation1, 0);
    animateDot(animation2, ANIMATION_DURATION);
    animateDot(animation3, ANIMATION_DURATION * 2);

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
          { opacity: animation1 },
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          { opacity: animation2 },
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          { opacity: animation3 },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
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
