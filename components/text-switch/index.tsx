import React from 'react';
import { TouchableWithoutFeedback, Animated, StyleSheet, View, Text } from 'react-native';

interface TextSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export const TextSwitch: React.FC<TextSwitchProps> = ({ value, onValueChange }) => {
  const animatedValue = React.useRef(new Animated.Value(value ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const switchTranslate = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 60], // Adjust according to the size
  });

  const textColorVoice = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#000000', '#fff'],
  });

  const textColorText = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#fff', '#000000'],
  });

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#4CAF50', '#ccc'], // Change colors as needed
  });

  return (
    <TouchableWithoutFeedback onPress={() => onValueChange(!value)}>
      <Animated.View style={[styles.container, { backgroundColor }]}>
        <Animated.View
          style={[
            styles.switchThumb,
            {
              transform: [{ translateX: switchTranslate }],
            },
          ]}
        />
        <View style={styles.textContainer}>
          <Animated.Text style={[styles.text, { color: textColorText }]}>Text</Animated.Text>
          <Animated.Text style={[styles.text, { color: textColorVoice }]}>Voice</Animated.Text>
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 120, // Adjust width as needed
    height: 40, // Adjust height as needed
    borderRadius: 20,
    backgroundColor: '#ccc',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  switchThumb: {
    width: 60, // Half of container width
    height: 40, // Same as container height
    backgroundColor: '#fff',
    borderRadius: 20,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  textContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
