import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

const Waveform = ({ audioLevel }: { audioLevel: number }) => {
  const numberOfBars = 30;
  const barScales = useRef(
    Array.from({ length: numberOfBars }, () => new Animated.Value(0.05))
  ).current;

  const [containerWidth, setContainerWidth] = useState(0);
  const [barWidth, setBarWidth] = useState(8); // Default width

  useEffect(() => {
    const centerIndex = (numberOfBars - 1) / 2;

    // Standard deviation for the Gaussian function
    const stdDev = numberOfBars / 5;

    barScales.forEach((barScale, index) => {
      const positionFactor = Math.exp(
        -Math.pow(index - centerIndex, 2) / (2 * Math.pow(stdDev, 2))
      );

      const targetScale = Math.max(0.05, audioLevel * positionFactor);

      Animated.timing(barScale, {
        toValue: targetScale,
        duration: 100,
        useNativeDriver: true, // Use native driver for better performance
      }).start();
    });
  }, [audioLevel]);

  useEffect(() => {
    if (containerWidth > 0) {
      const marginHorizontal = 1; // Same as in styles.bar
      const totalMargins = 2 * marginHorizontal * numberOfBars; // Each bar has margins on both sides
      const paddingLeft = 10; // Same as in styles.container
      const paddingRight = 0; // Update if you have paddingRight

      const availableWidth = containerWidth - paddingLeft - paddingRight - totalMargins;

      const calculatedBarWidth = availableWidth / numberOfBars;

      setBarWidth(calculatedBarWidth);
    }
  }, [containerWidth, numberOfBars]);

  return (
    <View
      style={styles.container}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        if (containerWidth === 0) {
          setContainerWidth(width);
        }
      }}
    >
      {barScales.map((barScale, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              width: barWidth,
              transform: [{ scaleY: barScale }],
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    paddingHorizontal: 10,
  },
  bar: {
    height: 50,
    backgroundColor: '#000',
    marginHorizontal: 1,
  },
});

export default Waveform;
