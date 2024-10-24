import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';

/**
 * Defines the properties required for each step in the SignupFlow.
 */
export interface StepProps {
  onNext: () => void;
  name: string;
  setName: (name: string) => void;
  gender: string;
  setGender: (gender: string) => void;
  voice: string;
  setVoice: (voice: string) => void;
  color: string;
  setColor: (color: string) => void;
  hobby: string;
  setHobby: (hobby: string) => void;
  // Add additional state setters and state variables as needed
}

/**
 * Represents a single step in the SignupFlow.
 */
export interface Step {
  key: string;
  render: (props: StepRenderProps) => React.ReactNode;
}

/**
 * Props passed to each step's render function.
 * All properties are required to ensure type safety.
 */
export type StepRenderProps = StepProps;

/**
 * SignupFlow Component
 * Handles a multi-step user signup process with smooth sequential animations.
 */
export const SignupFlow: React.FC = () => {
  // Step Management
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [topSection, setTopSection] = useState<'A' | 'B'>('A')

  const flipTopSection = () => {
    if (topSection === 'A') {
      setTopSection('B')
    } else {
      setTopSection('A')
    }
  }

  // Form Data
  const [name, setName] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [voice, setVoice] = useState<string>('');
  const [color, setColor] = useState<string>('');
  const [hobby, setHobby] = useState<string>(''); // Example of an additional step

  // Animation Values
  const outgoingAnim = useRef<Animated.Value>(new Animated.Value(1)).current;
  const incomingAnim = useRef<Animated.Value>(new Animated.Value(0)).current;

  /**
   * Handler to move to the next step with sequential animation.
   */
  const onNext = (): void => {
    if (isTransitioning) return; // Prevent multiple triggers
    setIsTransitioning(true);

    Animated.parallel([
      Animated.timing(outgoingAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
      Animated.timing(incomingAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      })
    ]).start(() => {
      // Update to next step
      setCurrentStepIndex((prevIndex) => prevIndex + 1);
      // Reset outgoing animation
      outgoingAnim.setValue(1);
      // Reset incoming animation
      incomingAnim.setValue(0);
      setIsTransitioning(false);

      flipTopSection()
    });
  }

  /**
   * Handler for final submission.
   */
  const onFinish = (): void => {
    console.log(
      `Name: ${name}, Gender: ${gender}, Voice: ${voice}, Color: ${color}, Hobby: ${hobby}`
    );
    // Implement further logic like API calls or navigation
  };

  /**
   * Define the steps of the SignupFlow.
   */
  const steps: Step[] = [
    {
      key: 'name',
      render: ({ onNext, setName, name }: StepRenderProps) => (
        <View style={styles.content}>
          <Text style={styles.title}>What's your name?</Text>
          <TextInput
            style={styles.input}
            placeholder="Type your name"
            placeholderTextColor="#888"
            value={name}
            onChangeText={setName}
            accessible={true}
            accessibilityLabel="Name Input"
          />
          <TouchableOpacity
            style={[styles.button, { opacity: name ? 1 : 0.5 }]}
            onPress={onNext}
            disabled={!name}
            accessible={true}
            accessibilityLabel="Proceed to the next step"
          >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </View>
      ),
    },
    {
      key: 'gender',
      render: ({ onNext, name, setGender }: StepRenderProps) => (
        <>
          <Text style={styles.title}>Hi {name}, what's your gender?</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              setGender('Male');
              onNext();
            }}
            accessible={true}
            accessibilityLabel="Select Male"
          >
            <Text style={styles.buttonText}>Male</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              setGender('Female');
              onNext();
            }}
            accessible={true}
            accessibilityLabel="Select Female"
          >
            <Text style={styles.buttonText}>Female</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              setGender('Nonbinary');
              onNext();
            }}
            accessible={true}
            accessibilityLabel="Select Nonbinary"
          >
            <Text style={styles.buttonText}>Nonbinary</Text>
          </TouchableOpacity>
        </>
      ),
    },
    {
      key: 'voice',
      render: ({ onNext, setVoice }: StepRenderProps) => (
        <>
          <Text style={styles.title}>Choose a voice for your AI chatbot</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              setVoice('Voice 1');
              onNext();
            }}
            accessible={true}
            accessibilityLabel="Select Voice 1"
          >
            <Text style={styles.buttonText}>Voice 1</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              setVoice('Voice 2');
              onNext();
            }}
            accessible={true}
            accessibilityLabel="Select Voice 2"
          >
            <Text style={styles.buttonText}>Voice 2</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              setVoice('Voice 3');
              onNext();
            }}
            accessible={true}
            accessibilityLabel="Select Voice 3"
          >
            <Text style={styles.buttonText}>Voice 3</Text>
          </TouchableOpacity>
        </>
      ),
    },
    // Add more steps as needed
  ];

  /**
   * Determine the next handler based on the current step.
   */
  const handleNext: () => void =
    currentStepIndex === steps.length - 1 ? onFinish : onNext;

  const [parentHeight, setParentHeight] = useState(0);

  // Handler to capture parent container's layout
  const onParentLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    setParentHeight(height);
  };

  // Interpolate the animated value to translateY
  const incomingY = incomingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [parentHeight, 0],
    extrapolate: 'clamp',
  });

  // Interpolate the animated value to translateY
  const outgoingY = outgoingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-parentHeight, 0],
    extrapolate: 'clamp',
  });

  const renderSectionA = () => {
    const opacity = topSection === 'A' ? outgoingAnim : incomingAnim
    const translate = topSection === 'A' ? outgoingY : incomingY
    const shouldShow = topSection === 'A' || (topSection === 'B' && currentStepIndex + 1 < steps.length)
    const stepDataIndex = topSection === 'A' ? currentStepIndex : currentStepIndex + 1

    if (shouldShow) {
      return (
        <Animated.View
          style={[
            styles.content,
            {
              opacity,
              transform: [
                {
                  translateY: translate
                },
              ],
            },
          ]}
        >
          {steps[stepDataIndex].render({
            onNext: handleNext,
            setName,
            setGender,
            setVoice,
            setColor,
            setHobby,
            name,
            gender,
            voice,
            color,
            hobby,
          })}
        </Animated.View>
      )
    } else {
      return <></>
    }
  }

  const renderSectionB = () => {
    const opacity = topSection === 'B' ? outgoingAnim : incomingAnim
    const translate = topSection === 'B' ? outgoingY : incomingY
    const shouldShow = topSection === 'B' || (topSection === 'A' && currentStepIndex + 1 < steps.length)
    const stepDataIndex = topSection === 'B' ? currentStepIndex : currentStepIndex + 1

    if (shouldShow) {
      return (
        <Animated.View
          style={[
            styles.content,
            {
              opacity,
              transform: [
                {
                  translateY: translate
                },
              ],
            },
          ]}
        >
          {steps[stepDataIndex].render({
            onNext: handleNext,
            setName,
            setGender,
            setVoice,
            setColor,
            setHobby,
            name,
            gender,
            voice,
            color,
            hobby,
          })}
        </Animated.View>
      )
    } else {
      return <></>
    }
  }


  return (
    <View style={[styles.container, {
      height: parentHeight * 2
    }]} onLayout={onParentLayout}>
      {currentStepIndex < steps.length && (
        <>
          {renderSectionA()}
          {renderSectionB()}
        </>
      )}
    </View>
  );
};

/**
 * Styles for the SignupFlow component.
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    position: 'relative', // Ensure absolute positioned incoming step aligns correctly
  },
  content: {
    // Ensures consistent spacing and positioning
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    alignContent: 'center',
    position: 'absolute', // Absolute positioning to overlay steps
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  completionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    color: '#333',
    marginBottom: 40,
    textAlign: 'center',
  },
  input: {
    fontSize: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingVertical: 10,
    marginBottom: 40,
    color: '#000',
    textAlign: 'center',
    width: '80%',
  },
  button: {
    borderWidth: 1,
    borderColor: '#333',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#f0f0f0',
    width: '80%',
  },
  buttonText: {
    color: '#333',
    fontSize: 18,
  },
});
