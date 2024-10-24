import React, { useState, useRef, ReactElement } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Settings } from '@prisma/client';

export interface StepProps {
  onNext: () => void;
  name: string;
  setName: (name: string) => void;
  gender: string;
  setGender: (gender: string) => void;
  voice: string;
  setVoice: (voice: string) => void;
}

export interface Step {
  key: string;
  component: ReactElement;
}

export type StepRenderProps = StepProps;

type Props = {
  session: Session
  settings: Settings
}

export const SignupFlow: React.FC<Props> = ({ session }) => {
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

  const [name, setName] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [voice, setVoice] = useState<string>('');

  const outgoingAnim = useRef<Animated.Value>(new Animated.Value(1)).current;
  const incomingAnim = useRef<Animated.Value>(new Animated.Value(0)).current;

  const onNext = (): void => {
    if (isTransitioning) return;
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
      setCurrentStepIndex((prevIndex) => prevIndex + 1);
      outgoingAnim.setValue(1);
      incomingAnim.setValue(0);
      setIsTransitioning(false);
      flipTopSection()
    });
  }

  const onFinish = async (): Promise<void> => {
    console.log(name)
    console.log(gender)
    console.log(voice)
    console.log(session.user.id)
    const { data, error } = await supabase
      .from('settings')
      .update({ name: name, gender: gender.toLowerCase(), voice: voice.replace(' ', '_').toLowerCase() })
      .eq('id', session.user.id)
      .select()

    console.log(data)

    // console.log(error)
    // console.log(data)
  };

  const steps: Step[] = [
    {
      key: 'name',
      component: (
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
      component: (
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
      component: (
        <>
          <Text style={styles.title}>Select a voice</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              setVoice('Voice 1');
              onFinish();
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
            }}
            accessible={true}
            accessibilityLabel="Select Voice 3"
          >
            <Text style={styles.buttonText}>Voice 3</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              onFinish();
            }}
            accessible={true}
            accessibilityLabel="Confirm"
          >
            <Text style={styles.buttonText}>Confirm</Text>
          </TouchableOpacity>
        </>
      ),
    },
  ];

  const [parentHeight, setParentHeight] = useState(0);

  const onParentLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    setParentHeight(height);
  };

  const incomingY = incomingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [parentHeight, 0],
    extrapolate: 'clamp',
  });

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
          {steps[stepDataIndex].component}
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
          {steps[stepDataIndex].component}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    position: 'relative',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    alignContent: 'center',
    position: 'absolute',
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
